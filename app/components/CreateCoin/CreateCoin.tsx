"use client";
/* eslint-disable @next/next/no-img-element */
import { yupResolver } from "@hookform/resolvers/yup";
import { bcs, fromHex } from "@mysten/bcs";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import init, {
  update_constants,
  update_identifiers,
} from "@mysten/move-bytecode-template";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import "./autofill-styles.css";
import coinTemplateBytes from "./coin-template-bytes";

import { SRM_COIN_CREATOR_FEE, SRM_COIN_CREATOR_WALLET,IMG_BASE_URL } from "@/app/config";
import Avatar from "@components/Avatar";
import CopyBtn from "@components/CopyBtn";
import ExplorerCoinLink from "@components/ExplorerLink/ExplorerCoinLink";
import ExplorerTxLink from "@components/ExplorerLink/ExplorerTxLink";
import { Spinner } from "@components/Spinner";
import Button from "@components/UI/Button";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI, normalizeSuiObjectId } from "@mysten/sui/utils";
import { ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as Yup from "yup";

const schema = Yup.object().shape({
  coinName: Yup.string().required("Token name is required"),
  symbol: Yup.string()
    .required("Token symbol is required")
    .matches(
      /^[A-Za-z0-9]{1,24}$/,
      "Symbol must contain only alphanumeric characters (1-24 characters, no spaces or special characters)"
    ),
  description: Yup.string().required("Description is required"),
  image: Yup.string().required("Image is required"),
  totalSupply: Yup.string().required("Total supply is required"),
});

const toHexString = (byteArray: Iterable<unknown> | ArrayLike<unknown>) =>
  Array.from(byteArray, (byte: any) =>
    ("0" + (byte & 0xff).toString(16)).slice(-2)
  ).join("");

export default function CreateCoin() {
  const suiClient = useSuiClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coinAdress, setCoinAdress] = useState("");
  const [publishedTX, setPublishedTX] = useState<any>({});
  const [mintTX, setMintTX] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const [decimals] = useState(9);

  const [updatedBytecode, setUpdatedBytecode] = useState("");
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [uploading, setUploading] = useState(false);
  const [isUploadImage, setIsUploadImage] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectImage = async () => {
    inputRef.current?.click();
  };
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      setResponseMessage(null);

      const response = await fetch(`${IMG_BASE_URL}upload.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setResponseMessage(`✅ ${result.message}`);
        setValue("image", file ? IMG_BASE_URL + result.file_path : "");
      } else {
        setResponseMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error uploading the image:", error);
      setResponseMessage("❌ Error uploading the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleChangeURL = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setValue("image", e.target.value);
    setResponseMessage("✅ URL updated");
  };
  const handleRemoveImage = () => {
    setValue("image", "");
    setResponseMessage(null);
  };

  useEffect(() => {
    async function loadWasm() {
      try {
        await init("/wasm/move_bytecode_template_bg.wasm");
        setLoading(false);
      } catch (err) {
        setError("Error al cargar el archivo WASM");
        console.error(err);
      }
    }
    loadWasm();
  }, []);

  const onSubmit = (data: {
    symbol: string;
    coinName: string;
    description: string;
    image: string;
  }) => {
    const { symbol, coinName, description, image } = data;

    console.log({ symbol, coinName, description, image });

    setIsLoading(true);

    try {
      let bytecode = coinTemplateBytes();

      // Actualiza identificadores
      bytecode = update_identifiers(bytecode, {
        PHANTOM_TYPE: symbol.toUpperCase(),
        phantom_type: symbol.toLowerCase(),
      });

      // Actualiza DECIMALS
      bytecode = update_constants(
        bytecode,
        bcs
          .u8()
          .serialize(parseInt(`${decimals}`, 10))
          .toBytes(),
        bcs.u8().serialize(0).toBytes(),
        "U8"
      );

      // Actualiza SYMBOL
      bytecode = update_constants(
        bytecode,
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode(symbol)))
          .toBytes(),
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode("SYMBOL")))
          .toBytes(),
        "Vector(U8)"
      );

      // Actualiza NAME
      bytecode = update_constants(
        bytecode,
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode(coinName)))
          .toBytes(),
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode("NAME")))
          .toBytes(),
        "Vector(U8)"
      );

      // Actualiza DESCRIPTION
      bytecode = update_constants(
        bytecode,
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode(description)))
          .toBytes(),
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode("DESCRIPTION")))
          .toBytes(),
        "Vector(U8)"
      );

      // Actualiza DESCRIPTION
      bytecode = update_constants(
        bytecode,
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode(image)))
          .toBytes(),
        bcs
          .vector(bcs.u8())
          .serialize(Array.from(new TextEncoder().encode("ICON_URL")))
          .toBytes(),
        "Vector(U8)"
      );

      const hexString = toHexString(bytecode);
      setUpdatedBytecode(hexString);
      console.log("handleCreateToken", { hexString, updatedBytecode });
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Error al actualizar el bytecode: " + err.message);
      setIsLoading(false);
    }
  };

  const handleCreateToken = () => {
    setIsLoading(true);
    console.log("signAndExecute", {
      address: currentAccount?.address,
      updatedBytecode,
    });
    if (!currentAccount?.address || !updatedBytecode) return;
    const tx = new Transaction();
    tx.setGasBudget(90_000_000);

    const [upgradeCap] = tx.publish({
      modules: [[...fromHex(updatedBytecode)]],
      dependencies: [normalizeSuiObjectId("0x1"), normalizeSuiObjectId("0x2")],
    });

    tx.transferObjects(
      [upgradeCap],
      tx.pure.address(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      )
    );

    const payAmountCoin = tx.splitCoins(tx.gas, [
      tx.pure.u64(SRM_COIN_CREATOR_FEE * Number(MIST_PER_SUI)),
    ]);
    tx.transferObjects(
      [payAmountCoin],
      tx.pure.address(SRM_COIN_CREATOR_WALLET)
    );

    console.log("signAndExecute");
    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: async (tx) => {
          console.log("Transaction success:", tx);
          const result = await suiClient.waitForTransaction({
            digest: tx.digest,
            options: { showObjectChanges: true },
          });
          console.log("result", result);
          let coinAdress: string = "";
          let treasuryCapObjectType;
          let treasuryCapObjectID;
          result?.objectChanges?.forEach((change) => {
            if (change.type === "published") {
              coinAdress = `${change.packageId}::${
                change.modules[0]
              }::${change.modules[0].toUpperCase()}`;
            }

            if (
              change.type === "created" &&
              change.objectType.includes("TreasuryCap")
            ) {
              treasuryCapObjectType = change.objectType;
              treasuryCapObjectID = change.objectId;
            }
          });

          if (coinAdress && treasuryCapObjectType && treasuryCapObjectID) {
            const txMint = new Transaction();
            const mintAmount =
              Number(getValues("totalSupply")) * 10 ** decimals;
            console.log({
              coinAdress,
              treasuryCapObjectType,
              treasuryCapObjectID,
            });
            setCoinAdress(coinAdress);
            setPublishedTX(tx);
            txMint.setGasPrice(1000);
            txMint.setGasBudget(30_000_000);
            txMint.moveCall({
              arguments: [
                txMint.object(treasuryCapObjectID),
                txMint.pure.u64(mintAmount),
                txMint.pure.address(currentAccount?.address),
              ],
              target: `0x2::coin::mint_and_transfer`,
              typeArguments: [coinAdress],
            });
            txMint.moveCall({
              arguments: [txMint.object(treasuryCapObjectID)],
              target: `0x2::transfer::public_freeze_object`,
              typeArguments: [treasuryCapObjectType],
            });
            txMint.setGasPrice(await suiClient.getReferenceGasPrice());
            signAndExecute(
              { transaction: txMint as any },
              {
                onSuccess: async (tx) => {
                  console.log("Mint Transaction success:", tx);
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  // TODO: deploy supply to lauchpad
                  setMintTX(tx);
                  setIsLoading(false);
                },
                onError: (error) => {
                  console.error("Error", error);
                  setIsLoading(false);
                },
              }
            );
          } else {
            console.log("Transaction failed");
            setIsLoading(false);
          }
        },
        onError: (error) => {
          console.error("Error", error);
          setIsLoading(false);
        },
      }
    );
  };

  const handleCreateAnotherCoin = () => {
    setCoinAdress("");
    setPublishedTX({});
    setMintTX({});
    setError(null);
    setIsLoading(false);
    reset();
    router.push("/launchpad/create-coin");
  };

  if (loading) return <Spinner />;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;

  return (
    <div style={{ maxWidth: "600px", minWidth: "300px", margin: "auto" }}>
      {!coinAdress ? (
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold mb-4">CREATE COIN</h1>
          <div className="text-white">
            Create a new token on the Sui blockchain.
            <br />
            Deployment Fee{" "}
            <span className="font-semibold text-white">
              {SRM_COIN_CREATOR_FEE} SUI
            </span>
          </div>
          <div className="flex flex-col">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex flex-col">
                  <label className="block text-slate-300">Coin Name:</label>
                  <input
                    id="coinName"
                    type="text"
                    className="w-full p-2 bg-[#130e18] placeholder-slate-500"
                    placeholder="Enter token name"
                    {...register("coinName")}
                  />
                  {errors.coinName && (
                    <span>{errors.coinName.message as any}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="block text-slate-300">Coin Symbol:</label>
                  <input
                    id="symbol"
                    type="text"
                    className="w-full p-2 bg-[#130e18] placeholder-slate-500"
                    placeholder="Enter token symbol"
                    {...register("symbol")}
                  />
                  {errors.symbol && (
                    <small className="text-red-500">
                      {errors.symbol.message as any}
                    </small>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="block text-slate-300">
                    Coin Description:
                  </label>
                  <input
                    id="description"
                    type="text"
                    className="w-full p-2 bg-[#130e18] placeholder-slate-500"
                    placeholder="Enter description"
                    {...register("description")}
                  />
                  {errors.description && (
                    <small className="text-red-500">
                      {errors.description.message as any}
                    </small>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="block text-slate-300">Total Supply:</label>
                  <input
                    id="totalSupply"
                    type="text"
                    className="w-full p-2 bg-[#130e18] placeholder-slate-500"
                    placeholder="Enter total supply"
                    {...register("totalSupply")}
                  />
                  {errors.totalSupply && (
                    <small className="text-red-500">
                      {errors.totalSupply.message as any}
                    </small>
                  )}
                </div>

                <div className="flex items-center justify-between p-2  border w-48 mb-2">
                  <button
                    className={`px-3 py-1 w-full ${
                      isUploadImage ? "bg-[#130e18]" : "button-primary"
                    }`}
                    onClick={() => setIsUploadImage(!isUploadImage)}
                  >
                    UPLOAD
                  </button>
                  <button
                    className={`px-3 py-1 w-full ${
                      !isUploadImage ? "bg-[#130e18]" : "button-primary"
                    }`}
                    onClick={() => setIsUploadImage(!isUploadImage)}
                  >
                    URL
                  </button>
                </div>
                {!isUploadImage && (
                  <div className="flex flex-col">
                    <label className="block text-slate-300">Image URL:</label>
                    <input
                      id="image"
                      type="text"
                      className="w-full p-2 bg-[#130e18] placeholder-slate-500"
                      placeholder="Enter Image URL"
                      onChange={(e) => handleChangeURL(e)}
                    />
                    {errors.image && (
                      <small className="text-red-500">
                        {errors.image.message as any}
                      </small>
                    )}
                  </div>
                )}

                {getValues().image ? (
                  <div className="relative">
                    <img
                      src={getValues().image}
                      alt="Uploaded"
                      className="rounded-md w-48 h-48 object-cover"
                      style={{ margin: "auto" }}
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  isUploadImage && (
                    <div
                      className="flex flex-col justify-center items-center p-4 border-2 border-dashed border-gray-500 rounded-md cursor-pointer"
                      onClick={handleSelectImage}
                    >
                      {uploading ? <Spinner /> : "Click to select image"}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7q.425 0 .713.288T13 4t-.288.713T12 5H5v14h14v-7q0-.425.288-.712T20 11t.713.288T21 12v7q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13zM17 7h-1q-.425 0-.712-.288T15 6t.288-.712T16 5h1V4q0-.425.288-.712T18 3t.713.288T19 4v1h1q.425 0 .713.288T21 6t-.288.713T20 7h-1v1q0 .425-.288.713T18 9t-.712-.288T17 8z"
                        ></path>
                      </svg>
                      <p className="text-gray-300 text-sm mb-1">
                        PNG, JPEG, WEB3, GIF
                      </p>
                      <p className="text-gray-500 text-xs mb-2">
                        Max size: 5MB
                      </p>
                      <input
                        ref={inputRef}
                        type="file"
                        className="sr-only text-sm text-gray-200"
                        name="file-upload"
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/webp, image/gif"
                      />
                      {errors.image && (
                        <small className="text-red-500">
                          {errors.image.message as any}
                        </small>
                      )}
                      {responseMessage && (
                        <div
                          className={`text-sm ${
                            responseMessage.startsWith("✅")
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {responseMessage}
                        </div>
                      )}
                      {getValues().image && <div>{getValues().image}</div>}
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 justify-between flex flex-col gap-4">
                {updatedBytecode === "" ? (
                  <Button
                    variant="primary"
                    size="full"
                    loading={isLoading}
                    type="submit"
                    // onClick={handleSubmit}
                  >
                    Compile
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="full"
                    // isLoading={isLoading}
                    type="submit"
                    onClick={handleCreateToken}
                  >
                    Launch
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="text-center max-w-md mx-auto bg-[#130e18] p-6 border border-slate-700 rounded-none">
          {/* token created successfully title */}
          <h2 className="text-2xl font-bold mb-4">Token Created Successfully</h2>
          <div className="flex items-center gap-2 justify-start mb-4">
            <Avatar src={getValues().image} alt={getValues().coinName} className="w-16 h-16 rounded-full" />
            <div className="flex flex-col">
              <span className="text-xl font-medium">{getValues().coinName}</span>
              <span className="text-lg text-gray-500">{getValues().symbol}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-start">
            Token CA:{" "}
            <ExplorerCoinLink tokenId={coinAdress}>
              {coinAdress.slice(0, 6)}...{coinAdress.slice(-16)}{" "}
              <ExternalLinkIcon className="w-4 h-4 ml-1 inline" />
            </ExplorerCoinLink>
            <CopyBtn text={coinAdress} />
          </div>
          <div className="flex items-center gap-2 justify-start">
            Publish TX:{" "}
            <ExplorerTxLink txHash={publishedTX?.digest}>
              {publishedTX?.digest?.slice(0, 6)}...
              {publishedTX?.digest?.slice(-6)}{" "}
              <ExternalLinkIcon className="w-4 h-4 ml-1 inline" />
            </ExplorerTxLink>
            <CopyBtn text={publishedTX?.digest} />
          </div>
          <div className="flex items-center gap-2 justify-start mb-4">
            Mint TX:{" "}
            {mintTX?.digest ? (
              <>
                <ExplorerTxLink txHash={mintTX?.digest}>
                  {mintTX?.digest?.slice(0, 6)}...{mintTX?.digest?.slice(-6)}{" "}
                  <ExternalLinkIcon className="w-4 h-4 ml-1 inline" />
                </ExplorerTxLink>
                <CopyBtn text={mintTX?.digest} />
              </>
            ) : (
              <Spinner />
            )}
          </div>
          {/* button to go back to create coin */}
          <Button
            variant="primary"
            size="full"
            onClick={handleCreateAnotherCoin}
          >
            Create Another Coin
          </Button>
        </div>
      )}
    </div>
  );
}
