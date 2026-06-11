import GameContainer from "@/app/components/GameContainer";

type Props = { params: Promise<{ roomId: string }> };

export default async function RoomPage({ params }: Props) {
	const { roomId } = await params;
	return <GameContainer roomId={roomId} />;
}
