// import { ICDocumentSearch } from "@/app/assets/icons";
import tw from "@/app/utils/twmerge";
import React from "react";

type Props = {
  title?: React.ReactNode;
  desc?: React.ReactNode;
  className?: string;
};

function EmptyData({ title, desc, className }: Props) {
  return (
    <div
      className={tw(
        "py-10 px-6 w-full flex flex-col items-center text-center",
        className,
      )}
    >
      {/* <ICDocumentSearch className="mb-6 w-12 h-auto text-gray-100" /> */}
      <div className="mb-1 font-bold text-xs text-skin-base">
        {title || "No data to display"}
      </div>
      <div className="font-medium text-2xs text-gray-100">{desc || ""}</div>
    </div>
  );
}

export default EmptyData;
