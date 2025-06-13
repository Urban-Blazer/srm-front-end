import CreateCoin from "@components/CreateCoin/CreateCoin";
import { Suspense } from "react";

export default function CreateCoinPage() {
    return (
        <div className="p-6">
            <Suspense fallback={"Loading..."}>
                <CreateCoin />
            </Suspense>
        </div>
    );
}