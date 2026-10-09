"use client";

import { forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { ChefHat, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { UploadedImage } from "@/components/UploadedImage";
import { Overlay, NoPhoto, type RecipeCardData } from "@/components/RecipeCard";

const COMMIT_OFFSET = 120;
const COMMIT_VELOCITY = 500;
const FLY_OUT_X = 600;

// Deterministic per-recipe jitter angle (-3..3deg) — looks random across
// cards, but stays put for a given card as it moves between stack layers.
function jitterDeg(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 7) - 3;
}

// Depth-in-stack visuals: 0 = active/top card, 1-2 sit further back.
// Front card is shrunk instead of the back ones, so the back cards show
// around its edges directly — no offset-vs-shrink cancellation to get right.
const STACK_VISUALS: Record<0 | 1 | 2, { scale: number; y: number; filter: string }> = {
  0: { scale: 0.95, y: 0, filter: "blur(0px) saturate(1)" },
  1: { scale: 0.965, y: -12, filter: "blur(0px) saturate(1)" },
  2: { scale: 0.98, y: -24, filter: "blur(1.5px) saturate(0.85)" },
};

export type SwipeCardHandle = { commit: (dir: "left" | "right") => void };

export const SwipeCard = forwardRef<SwipeCardHandle, {
  recipe: RecipeCardData;
  active: boolean;
  stackIndex: 0 | 1 | 2;
  onExited: (dir: "left" | "right") => void;
  /** Tap without dragging (framer's onTap ignores drags). */
  onTap?: () => void;
}>(function SwipeCard({ recipe, active, stackIndex, onExited, onTap }, ref) {
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-300, 300], [-20, 20]);
  const rejectOpacity = useTransform(x, [-COMMIT_OFFSET, 0], [1, 0]);
  const commitOpacity = useTransform(x, [0, COMMIT_OFFSET], [0, 1]);
  const badgeScale = useTransform(x, [-COMMIT_OFFSET, 0, COMMIT_OFFSET], [1, 0.6, 1]);
  const jitter = active ? 0 : jitterDeg(recipe.id);

  function fly(dir: "left" | "right") {
    animate(x, dir === "right" ? FLY_OUT_X : -FLY_OUT_X, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      onComplete: () => onExited(dir),
    });
    animate(opacity, 0, { duration: 0.3 });
  }

  useImperativeHandle(ref, () => ({ commit: fly }));

  function handleDragEnd(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.x > COMMIT_OFFSET || info.velocity.x > COMMIT_VELOCITY) fly("right");
    else if (info.offset.x < -COMMIT_OFFSET || info.velocity.x < -COMMIT_VELOCITY) fly("left");
    // sotto soglia: dragConstraints + dragElastic riportano la carta a x=0 da sole
  }

  const cardBody = recipe.photoUrl ? (
    <>
      <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
      <Overlay recipe={recipe} big />
    </>
  ) : (
    <NoPhoto recipe={recipe} tall big />
  );

  const stamps = active && (
    <>
      <motion.div
        style={{ opacity: rejectOpacity, scale: badgeScale }}
        className="pointer-events-none absolute left-4 top-4 rounded-full bg-surface/90 p-3 text-destructive shadow-md"
      >
        <X className="h-8 w-8" aria-hidden="true" />
      </motion.div>
      <motion.div
        style={{ opacity: commitOpacity, scale: badgeScale }}
        className="pointer-events-none absolute right-4 top-4 rounded-full bg-surface/90 p-3 text-success shadow-md"
      >
        <ChefHat className="h-8 w-8" aria-hidden="true" />
      </motion.div>
    </>
  );

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, opacity }}
      drag={active ? "x" : false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onTap={active ? onTap : undefined}
      animate={STACK_VISUALS[stackIndex]}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {active ? (
        <Card className="relative aspect-[3/4] h-full w-full overflow-hidden">
          {cardBody}
          {stamps}
        </Card>
      ) : (
        <Card
          className="relative aspect-[3/4] h-full w-full overflow-hidden"
          style={jitter ? { transform: `rotate(${jitter}deg)` } : undefined}
        >
          {cardBody}
        </Card>
      )}
    </motion.div>
  );
});
