import { getInput, info, setFailed, setOutput } from '@actions/core';
import { determineVersion } from './determine-version';
import {
  checkout,
  createAnnotatedTag,
  createLightweightTag,
  refExists,
  validateHistoryDepth,
} from './git';
import { getEnv } from './utils';

async function run(): Promise<void> {
  await validateHistoryDepth();
  await checkout('HEAD~1');

  let previousVersion = await determineVersion();

  info(`Previous version: ${previousVersion}`);
  setOutput('previous-version', previousVersion);

  await checkout(getEnv('GITHUB_REF'));

  let currentVersion = await determineVersion();

  info(`Current version: ${currentVersion}`);
  setOutput('current-version', currentVersion);

  if (currentVersion !== previousVersion && getInput('create-tag') !== 'false') {
    let tagTemplate = getInput('tag-template') || 'v{VERSION}';
    let tag = tagTemplate.replace(/{VERSION}/g, currentVersion);
    let useAnnotatedTag = getInput('use-annotated-tag') !== 'false';

    if (await refExists(tag)) {
      info(`Tag ${tag} already exists`);
    } else {
      if (useAnnotatedTag) {
        let tagMessageTemplate = getInput('tag-message-template') || tag;
        let tagMessage = tagMessageTemplate.replace(/{VERSION}/g, currentVersion);

        const taggerName = getInput('tagger-name', { required: true });
        const taggerEmail = getInput('tagger-email', { required: true });

        info(`Creating annotated tag ${tag} with message "${tagMessage}"`);
        await createAnnotatedTag({
          tag,
          tagMessage,
          taggerName,
          taggerEmail,
        });
      } else {
        info(`Creating tag ${tag}`);
        await createLightweightTag(tag);
      }
      setOutput('tag', tag);
    }
  }
}

run().catch(e => setFailed(e.message));
