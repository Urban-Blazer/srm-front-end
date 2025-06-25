import PoolsBar from "@components/PoolsBar";

export default function Rewardians() {
  return (
    <div className="flex flex-col min-h-screen text-white bg-[#000306]">
      <div className="w-full p-6 border-b border-gray-800 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="flex flex-col mb-6 col-span-12">
            <PoolsBar featuredCoinBSymbol={"TKI"} initialExpanded={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
