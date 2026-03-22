export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
}

export interface GitStash {
  index: number;
  message: string;
}

export interface GitPullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  url: string;
  createdAt: string;
}

export interface GitIssue {
  number: number;
  title: string;
  state: string;
  author: string;
  labels: string[];
  url: string;
  createdAt: string;
}

export interface CiCheck {
  name: string;
  status: string;
  conclusion: string | null;
  url: string | null;
}

export interface AuthAccount {
  provider: string;
  hasToken: boolean;
}
