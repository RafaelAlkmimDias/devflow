export interface SearchMatch {
  line: number;
  content: string;
  match: string;
}

export interface GroupedResult {
  filePath: string;
  relativePath: string;
  fileName: string;
  matches: SearchMatch[];
}
