export default function cloneDatastore(url: string, directoryPath?: string, options?: {
    embedCredits?: {
        id: string;
        secret: string;
    };
}): Promise<{
    datastoreFilePath: string;
}>;
