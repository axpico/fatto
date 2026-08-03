"use client";

import { forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { UploadedImage } from "@/components/UploadedImage";
import { Overlay, NoPhoto, type RecipeCardData } from "@/components/RecipeCard";

const COMMIT_OFFSET = 120;
const COMMIT_VELOCITY = 500;
const FLY_OUT_X = 600;

export type SwipeCardHandle = { commit: (dir: "left" | "right") => void };

export const SwipeCard = forwardRef<SwipeCardHandle, {
  recipe: RecipeCardData;
  active: boolean;
  onExited: (dir: "left" | "right") => void;
}>(function SwipeCard({ recipe, active, onExited }, ref) {
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-300, 300], [-20, 20]);

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

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, opacity }}
      drag={active ? "x" : false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={active ? { scale: 1, y: 0 } : { scale: 0.95, y: 8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className="relative aspect-[3/4] h-full w-full overflow-hidden">
        {recipe.photoUrl ? (
          <>
            <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
            <Overlay recipe={recipe} big />
          </>
        ) : (
          <NoPhoto recipe={recipe} tall big />
        )}
      </Card>
    </motion.div>
  );
});
