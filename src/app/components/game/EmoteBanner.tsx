"use client";

import { motion } from "framer-motion";
import { emoteSrc } from "@/shared/emote";

export interface EmoteBannerProps {
	value: string;
	onComplete: () => void;
}

export default function EmoteBanner({ value, onComplete }: EmoteBannerProps) {
	return (
		<motion.div
			className="g2-emote-banner"
			initial={{ scale: 0, opacity: 0, y: 0 }}
			animate={{
				scale: [0, 1.2, 0.9, 1.05, 1, 1, 1, 1.15, 0],
				rotate: [0, 0, 0, -3, 2, -1, 0, 8, -12],
				y: [0, 0, 0, -3, 1, 0, 0, -6, -10],
				opacity: [0, 1, 1, 1, 1, 1, 1, 0.65, 0],
			}}
			transition={{
				duration: 2.5,
				times: [0, 0.08, 0.16, 0.28, 0.36, 0.5, 0.72, 0.86, 1],
				ease: "easeOut",
			}}
			onAnimationComplete={onComplete}
		>
			<img src={emoteSrc(value)} alt="" className="g2-emote-banner-emoji" />
		</motion.div>
	);
}
