import { getInput, setFailed, setOutput, info } from '@actions/core';
import { determineVersion } from './determine-version';
import { validateHistoryDepth, checkout, createTag, refExists } from './git';
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
    let tagMessageTemplate = getInput('tag-message-template') || tag;
    let tagMessage = tagMessageTemplate.replace(/{VERSION}/g, currentVersion);

    if (await refExists(tag)) {
      info(`Tag ${tag} already exists`);
    } else {
      if (useAnnotatedTag) {
        info(`Creating annotated tag ${tag} with message "${tagMessage}"`);
      } else {
        info(`Creating tag ${tag}`);
      }
      setOutput('tag', tag);

      await createTag(tag, useAnnotatedTag ? tagMessage : undefined);
    }
  }
}

run().catch(e => setFailed(e.message));
