export interface Event {
  id: string;
  name: string;
  memo: string;
  creatorTokenHash: string;
  candidates: Candidate[];
  responses: Response[];
  createdAt: string;
}

/** Context passed to views when the current browser is the event creator. */
export interface CreatorContext {
  isCreator: boolean;
  editUrl?: string;
}

export interface Candidate {
  id: number;
  date: string;
  sortOrder: number;
}

export interface Response {
  id: number;
  participantName: string;
  comment: string;
  statuses: ResponseDetail[];
  createdAt: string;
}

export interface ResponseDetail {
  candidateId: number;
  status: "〇" | "△" | "×";
}
