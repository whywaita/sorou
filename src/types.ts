export interface Event {
  id: string;
  name: string;
  memo: string;
  candidates: Candidate[];
  responses: Response[];
  createdAt: string;
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
