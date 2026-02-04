declare module "arabic-reshaper" {
  const arabicReshaper: {
    convertArabic: (text: string) => string
  }
  export default arabicReshaper
}

declare module "bidi-js" {
  const bidiFactory: () => {
    getEmbeddingLevels: (text: string, direction?: "ltr" | "rtl") => any
    getReorderedString: (text: string, levels: any, start?: number, end?: number) => string
  }
  export default bidiFactory
}
