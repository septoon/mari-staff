import clsx from 'clsx';
import type { ReactNode } from 'react';
import { BottomSheet, type BottomSheetProps } from 'react-spring-bottom-sheet';

type PageSheetProps = {
  open: boolean;
  onDismiss: () => void;
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  snapPoints?: BottomSheetProps['snapPoints'];
  defaultSnap?: BottomSheetProps['defaultSnap'];
  maxHeight?: number;
  blocking?: boolean;
};

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PageSheet({
  open,
  onDismiss,
  children,
  className,
  header,
  footer,
  snapPoints,
  defaultSnap,
  maxHeight,
  blocking = true,
}: PageSheetProps) {
  const resolvedSnapPoints: BottomSheetProps['snapPoints'] = ({
    minHeight,
    maxHeight: sheetMaxHeight,
    ...rest
  }) => {
    const safeMin = isFiniteNumber(minHeight) && minHeight > 0 ? minHeight : 1;
    const safeMaxBase =
      isFiniteNumber(sheetMaxHeight) && sheetMaxHeight > 0 ? sheetMaxHeight : safeMin;
    const safeMax = Math.max(safeMin, safeMaxBase);

    const rawPoints = snapPoints
      ? snapPoints({ minHeight: safeMin, maxHeight: safeMax, ...rest })
      : [safeMin];
    const list = Array.isArray(rawPoints) ? rawPoints : [rawPoints];
    const normalized = Array.from(
      new Set(
        list
          .map((point) =>
            isFiniteNumber(point) ? clamp(Math.round(point), safeMin, safeMax) : safeMin,
          )
          .filter(isFiniteNumber),
      ),
    ).sort((left, right) => left - right);

    return normalized.length > 0 ? normalized : [safeMin];
  };

  const resolvedDefaultSnap: BottomSheetProps['defaultSnap'] = (props) => {
    const points =
      props.snapPoints.length > 0 ? props.snapPoints : resolvedSnapPoints(props) as number[];
    const minPoint = points[0] ?? 1;
    const maxPoint = points[points.length - 1] ?? minPoint;
    const fallback = maxPoint;

    if (typeof defaultSnap === 'number') {
      return isFiniteNumber(defaultSnap) ? clamp(defaultSnap, minPoint, maxPoint) : fallback;
    }
    if (typeof defaultSnap === 'function') {
      const value = defaultSnap(props);
      return isFiniteNumber(value) ? clamp(value, minPoint, maxPoint) : fallback;
    }
    return fallback;
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      className={clsx('mari-page-sheet', className)}
      header={header}
      footer={footer}
      snapPoints={resolvedSnapPoints}
      defaultSnap={resolvedDefaultSnap}
      maxHeight={maxHeight}
      blocking={blocking}
      skipInitialTransition
      scrollLocking
    >
      {children}
    </BottomSheet>
  );
}
