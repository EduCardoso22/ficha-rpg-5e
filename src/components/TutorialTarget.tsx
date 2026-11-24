import { ComponentRef, ReactNode, useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { TutorialRect, useTutorialStore } from '@/store/useTutorialStore';

export function TutorialTarget({
  id,
  children,
  style,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const registerTarget = useTutorialStore((s) => s.registerTarget);
  const unregisterTarget = useTutorialStore((s) => s.unregisterTarget);

  useEffect(() => {
    const measure = () =>
      new Promise<TutorialRect | null>((resolve) => {
        const node = ref.current;
        if (!node || typeof node.measureInWindow !== 'function') {
          resolve(null);
          return;
        }
        node.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (!width || !height || Number.isNaN(x) || Number.isNaN(y)) {
            resolve(null);
            return;
          }
          resolve({ x, y, width, height });
        });
      });

    registerTarget(id, measure);
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
