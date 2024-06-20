export default function cloneDatastore(url: string, directoryPath?: string, options?: {
    embedCredits?: {
        id: string;
        secret: string;
    };
    mainchainUrl?: string;
}): Promise<{
    datastoreFilePath: string;
}>;
