interface BusyOverlayProps {
	message: string;
	detail?: string;
	/** Defaults to `status` for in-progress work; use `alert` for important blocking states. */
	role?: "status" | "alert" | "alertdialog";
}

/** Full-screen blocker for slow API / database work. Sits above nav (z-50). */
export default function BusyOverlay({ message, detail, role = "status" }: BusyOverlayProps) {
	return (
		<div
			className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm"
			style={{ backgroundColor: "var(--b-overlay)" }}
			role={role}
			aria-busy="true"
			aria-live="polite"
		>
			<div className="panel">
				<div className="flex flex-col items-center p-6 gap-2">
					<div className="app-spinner mb-4" aria-hidden />
					<p className="text-lg text-center" style={{ color: "var(--b-fg)" }}>
						{message}
					</p>
					{detail && (
						<p className="text-sm text-center" style={{ color: "var(--b-muted)" }}>
							{detail}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
