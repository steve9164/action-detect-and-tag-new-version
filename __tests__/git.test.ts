import * as git from '../src/git';
import execa from 'execa';
import { runTestsInScratchDirectory } from './helpers/scratch-directory';
import { initRepository, addAndTrackRemote } from './helpers/git';

runTestsInScratchDirectory();

beforeEach(async () => {
  await initRepository(process.cwd());
});

describe('validateHistoryDepth', () => {
  test('rejects with only one commit', async () => {
    expect.assertions(1);
    try {
      await git.validateHistoryDepth();
    } catch (error) {
      expect(error.message).toMatch('shallow clone');
    }
  });

  test('resolves with multiple commits', async () => {
    expect.assertions(0);
    await execa('git', ['commit', '--allow-empty', '-m', 'an empty commit']);
    await git.validateHistoryDepth();
  });
});

describe('refExists', () => {
  test('returns true for existing refs', async () => {
    await execa('git', ['tag', 'a-tag']);
    expect(await git.refExists('HEAD')).toBe(true);
    expect(await git.refExists('master')).toBe(true);
    expect(await git.refExists('a-tag')).toBe(true);
  });

  test('returns true for existing refs', async () => {
    expect(await git.refExists('HEAD~3')).toBe(false);
    expect(await git.refExists('nonexistent-branch')).toBe(false);
    expect(await git.refExists('a-tag')).toBe(false);
  });
});

describe('createTag', () => {
  test('creates and pushes the given lightweight tag', async () => {
    await initRepository('upstream');
    await addAndTrackRemote('foo', 'upstream/.git');

    await git.createLightweightTag('foo-bar');

    let localTag = await execa('git', ['tag']);
    expect(localTag.stdout.trim()).toBe('foo-bar');
    let localTagCheckLightweight = await execa('git', ['cat-file', '-t', 'foo-bar']);
    expect(localTagCheckLightweight.stdout.trim()).toBe('commit');

    let remoteTag = await execa('git', ['tag'], { cwd: 'upstream' });
    expect(remoteTag.stdout.trim()).toBe('foo-bar');
    let remoteTagCheckLightweight = await execa('git', ['cat-file', '-t', 'foo-bar']);
    expect(remoteTagCheckLightweight.stdout.trim()).toBe('commit');
  });

  test('creates and pushes an annotated tag with a message', async () => {
    await initRepository('upstream');
    await addAndTrackRemote('foo', 'upstream/.git');

    await git.createAnnotatedTag({
      tag: 'foo-bar',
      tagMessage: 'tag message',
      taggerName: 'Automated Test',
      taggerEmail: 'test@example.com',
    });

    const catFileLines = [
      /^object/,
      /^type commit$/,
      /^tag foo-bar$/,
      /^tagger Automated Test <test@example.com>/,
      /^$/,
      /^tag message$/,
    ];

    let localTagCheckAnnotated = await execa('git', ['cat-file', 'tag', 'foo-bar']);
    let localLines = localTagCheckAnnotated.stdout.trim().split('\n');
    catFileLines.forEach((re, i) => expect(localLines[i]).toMatch(re));

    let remoteTagCheckAnnotated = await execa('git', ['cat-file', 'tag', 'foo-bar']);
    let remoteLines = remoteTagCheckAnnotated.stdout.trim().split('\n');
    catFileLines.forEach((re, i) => expect(remoteLines[i]).toMatch(re));
  });
});
