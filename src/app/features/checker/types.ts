
export interface Issue {
    id: number;
    original: string;
    suggestion: string;
    reason: string;
    start: number;
    end: number;
    fixed: boolean;
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
