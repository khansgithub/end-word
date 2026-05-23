declare module "wink-lexicon" {
  const lexicon: {
    wnWords: Record<string, number>;
    wnWordSenses: Record<number, number[]>;
    wnSenses: string[];
  };
  export default lexicon;
}
