export interface BlogPollResultOption {
  id: string;
  label: string;
  count: number;
  percent: number;
}

export interface BlogPollResults {
  pollId: string;
  selectedOptionId: string | null;
  resultsVisible: boolean;
  totalResponses: number;
  options: readonly BlogPollResultOption[];
}

export interface BlogPollTarget {
  postId: string;
  postSlug: string;
  pollId: string;
}

export interface SubmitBlogPollVoteRequest extends BlogPollTarget {
  optionId: string;
}
