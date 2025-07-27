
export type IssueCategory = '错别字' | '语法错误' | '标点符号' | '表达优化';

export interface Issue {
    id: number;
    original: string;
    suggestion: string;
    reason: string;
    start: number;
    end: number;
    fixed: boolean;
    ignored?: boolean;
    category?: IssueCategory;
}

export interface ResultSegment {
    type: 'text' | 'highlight';
    content: string;
    issue?: Issue; // Only present for 'highlight' type
}

export interface Voice {
    id: string;
    name: string;
}

export interface Correction {
    original: string;
    suggestion: string;
}

export interface Thesaurus {
    id: string;
    name: string;
    corrections: Correction[];
    enabled: boolean;
}
