export type SeoStructuredDataValue =
  | string
  | number
  | boolean
  | null
  | SeoStructuredDataObject
  | readonly SeoStructuredDataValue[];

export interface SeoStructuredDataObject {
  readonly [key: string]: SeoStructuredDataValue;
}

export interface SeoArticleMetadata {
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
  section?: string;
  tags?: readonly string[];
}

export interface SeoMetadata {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
  robots?: string;
  article?: SeoArticleMetadata;
  structuredData?: SeoStructuredDataObject | readonly SeoStructuredDataObject[];
}
