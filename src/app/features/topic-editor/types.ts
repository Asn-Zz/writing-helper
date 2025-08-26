export interface Book {
    bookInfo: {
        title: string;
        author: string;
        cover: string;
        bookId: string;
        newRating: number;
        newRatingCount: number;
    }
    readingCount: number;
}

export interface Author {
    userInfo: {
        name: string;
        vdesc: string;
        avatar: string;
    }
    desc: string;
    totalCount: number;
    hints: string;
}

export interface BookText extends Book {
    bookContentInfo: {
        abstract: string;
    };
}

export interface Result {
    title: string;
    scopeCount: number;
    books: Book[];
    authors?: Author[];
    bookTexts?: BookText[];
}