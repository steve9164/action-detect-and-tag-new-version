import execa from 'execa';

export async function validateHistoryDepth(): Promise<void> {
  try {
    await execa('git', ['rev-parse', 'HEAD~1']);
  } catch {
    throw new Error(
      'This appears to be a shallow clone of your project. ' +
        'To determine whether the project version has changed and a new tag needs to be created, ' +
        'you should set a `fetch-depth` of 2 or higher on `@actions/checkout`.',
    );
  }
}

export async function refExists(ref: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', ref]);
    return true;
  } catch {
    return false;
  }
}

export async function checkout(ref: string): Promise<void> {
  await execa('git', ['checkout', ref]);
}

export async function createLightweightTag(name: string): Promise<void> {
  await execa('git', ['tag', name]);
  await execa('git', ['push', '--tags']);
}

export async function createAnnotatedTag({
  tag,
  tagMessage,
  taggerName,
  taggerEmail,
}: {
  tag: string;
  tagMessage: string;
  taggerName: string;
  taggerEmail: string;
}): Promise<void> {
  const configArgs = ['-c', `user.name=${taggerName}`, '-c', `user.email=${taggerEmail}`];
  await execa('git', [...configArgs, 'tag', tag, '-m', tagMessage]);
  await execa('git', ['push', '--tags']);
}
