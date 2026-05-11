import { listFeedbacks } from "./actions";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
	const feedbacks = await listFeedbacks();
	return <FeedbackClient feedbacks={feedbacks} />;
}
