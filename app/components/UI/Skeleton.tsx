import tw from "@/app/utils/twmerge";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={tw("animate-pulse bg-gray-100/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
