interface Commit {
  cid: string;
  rev: string;
}

interface Node {
  cid: string;
  commit: Commit;
  uri: string;
  validationStatus: 'valid' | 'invalid' | string; // can narrow if known
}

export interface BlueskyReply {
  parent: Node;
  root: Node;
}