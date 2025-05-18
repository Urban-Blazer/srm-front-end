import { useEffect, useRef, useState } from "react";
function onSticky(
  selector: string | HTMLElement,
  callback: (isSticky: boolean) => void,
  options?: IntersectionObserverInit,
) {
  const element =
    typeof selector === "string" ? document.querySelector(selector) : selector;

  if (!element) {
    return;
  }

  const observer = new IntersectionObserver(
    ([event]) => {
      callback(event.intersectionRatio < 1);
    },
    { threshold: [1], rootMargin: "-1px 0px 0px 0px", ...options },
  );
  observer.observe(element);

  return { observer, element };
}
function useSticky<Target extends HTMLElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<Target>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const sticky = onSticky(ref.current, setIsSticky, options);

    return () => sticky?.observer.unobserve(sticky?.element);
  }, [options]);

  return { isSticky, ref };
}

export default useSticky;
