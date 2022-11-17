import { Command } from 'commander';
import * as Path from 'path';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import * as Fs from 'fs';
import { sidechainHostOption } from '@ulixee/sidechain/cli/common';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import { createGiftCard } from '@ulixee/sidechain/cli/giftCardsCli';

export default function giftCardCommands(): Command {
  const giftCardIssuersDir = Path.join(getCacheDirectory(), 'ulixee', 'gift-card-issuers');

  const cli = new Command('gift-cards');
  cli
    .command('create')
    .description('Create a gift card for a databox.')
    .argument('<path>', 'The path of the entrypoint to the databox.')
    .addOption(sidechainHostOption)
    .requiredOption(
      '-m, --amount <value>',
      'The value of this gift card. Amount can postfix "c" for centagons (eg, 50c) or "m" for microgons (5000000m).',
      /\d+[mc]?/,
    )
    .option('-i, --identity <idBech32String>', 'Use an existing gift card issuer.')
    .option(
      '-m, --miner-db-host <host>',
      'Your miner host ip and port accepting postgres connections',
    )
    .action(async (path, { identity, amount, host, minerDbHost }) => {
      let manifest: Partial<IDataboxManifest> = {};
      const specifiedIdentity = !!identity;
      const manifestPath = Path.resolve(path).replace(Path.extname(path), '-manifest.json');
      if (Fs.existsSync(manifestPath)) {
        manifest = (await readFileAsJson<IDataboxManifest>(manifestPath)) ?? {};
        identity = manifest.giftCardIssuerIdentity;
      }

      let signer: Identity;
      if (identity) {
        signer = Identity.loadFromFile(Path.join(giftCardIssuersDir, `${identity}.pem`));
        if (!signer && specifiedIdentity)
          throw new Error(
            `The gift card issuer you requested could not be found locally (${Path.join(
              giftCardIssuersDir,
              `${identity}.pem`,
            )}).`,
          );
        else if (!signer)
          throw new Error(
            `The gift card issuer for this Databox could not be found in the gift card issuers directory (${Path.join(
              giftCardIssuersDir,
              `${identity}.pem`,
            )}).`,
          );
      }

      if (!signer) {
        signer = await Identity.create();
        await signer.save(Path.join(giftCardIssuersDir, `${signer.bech32}.pem`));
      }

      if (manifest.giftCardIssuerIdentity !== signer.bech32) {
        manifest.giftCardIssuerIdentity = signer.bech32;
        await Fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`

!! You must re-upload your Databox for gift cards to take effect. !!
        
`);
      }

      const giftCard = await createGiftCard({
        amount,
        identityPath: Path.join(giftCardIssuersDir, `${signer.bech32}.pem`),
        host,
      });

      if (minerDbHost) {
        console.log(`Or they can try out your databox over a PostgreSQL connection:
"postgres://${giftCard.giftCardId}:${giftCard.redemptionKey}@${minerDbHost}"
`);
      }
    });

  cli
    .command('create-issuer')
    .description('Create an issuer identity')
    .action(async () => {
      const issuer = await Identity.create();
      await issuer.save(Path.join(giftCardIssuersDir, `${issuer.bech32}..pem`));
      console.log(
        'Gift card issuer created at %s.',
        Path.join(giftCardIssuersDir, `${issuer.bech32}.pem`),
      );
    });

  cli
    .command('list-issuers')
    .description('List installed issuer identities')
    .action(async () => {
      let keys: string[] = [];
      if (!Fs.existsSync(giftCardIssuersDir)) {
        keys = await Fs.promises.readdir(giftCardIssuersDir);
        keys = keys.filter(x => x.endsWith('..pem')).map(x => x.replace('.pem', ''));
      }
      if (!keys.length) {
        console.log(
          'You have no installed gift card issuers. They would be installed here if you had any: %s',
          giftCardIssuersDir,
        );
        return;
      }

      console.log('You have the following gift card issuers installed %s.', keys.toString());
    });
  return cli;
}
