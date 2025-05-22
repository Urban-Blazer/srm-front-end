// import { withButton } from '@/twPlugins/button';
// import { withColoredDropShadow } from '@/twPlugins/colored-drop-shadow';
// import { extendTailwindMerge } from 'tailwind-merge';
// import resolveConfig from 'tailwindcss/resolveConfig';
// import theme from '../../tailwind.config';
import { twMerge } from "tailwind-merge";

// export const tailwindConfig = resolveConfig(theme);
// const tw = extendTailwindMerge(
//   // {
//   //   extend: {
//   //     classGroups: {
//   //       'font-size': [
//   //         { text: Object.keys(tailwindConfig.theme?.fontSize || {}) },
//   //       ],
//   //       shadow: [{ shadow: ['soft', 'soft-2', 'soft-3'] }],
//   //       'shadow-color': [
//   //         { shadow: [(value: string) => value.startsWith('skin')] },
//   //       ],
//   //     },
//   //   },
//   // },
//   // withButton,
//   // withColoredDropShadow,
// );

const tw = twMerge;

export function mergeClassObject<T extends Record<any, any>>(...obj: T[]) {
  return obj.reduce(
    (sum, o) => ({
      ...sum,
      ...Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, tw(sum[k], v)]),
      ),
    }),
    obj[0],
  );
}

export default tw;
