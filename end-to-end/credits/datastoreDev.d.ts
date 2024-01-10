export default function main(needsClosing: (() => Promise<any> | any)[], rootDir: string): Promise<{
    creditUrl: string;
    cloudAddress: string;
    datastoreId: string;
    datastoreVersion: string;
}>;
