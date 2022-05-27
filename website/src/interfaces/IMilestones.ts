export default interface IMilestones {
  [version: string]: {
    heading: string;
    description: string;
    tools: { name: string }[];
  }
}