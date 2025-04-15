import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { cwd } from 'node:process';
import { readFile } from 'node:fs/promises';

const findFile = (file) => {
    let dir = cwd();

    while (dir !== parse(dir).root) {
        if (existsSync(join(dir, file))) {
            return dir;
        }

        dir = join(dir, '../');
    }
    return null; // undefined 대신 null 반환
}

const root = findFile('.git');
const pack = findFile('package.json');

const readGit = async (filename) => {
    if (!root) {
        return null; // 예외를 발생시키는 대신 null 반환
    }

    try {
        return await readFile(join(root, filename), 'utf8');
    } catch (error) {
        console.warn(`${filename}을 읽을 수 없습니다:`, error.message);
        return null;
    }
}

export const getCommit = async () => {
    try {
        const head = await readGit('.git/logs/HEAD');
        return head
            ?.split('\n')
            ?.filter(String)
            ?.pop()
            ?.split(' ')[1] || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

export const getBranch = async () => {
    if (process.env.CF_PAGES_BRANCH) {
        return process.env.CF_PAGES_BRANCH;
    }

    try {
        const head = await readGit('.git/HEAD');
        return head
            ?.replace(/^ref: refs\/heads\//, '')
            ?.trim() || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

export const getRemote = async () => {
    try {
        let remote = (await readGit('.git/config'))
            ?.split('\n')
            ?.find(line => line.includes('url = '))
            ?.split('url = ')[1];

        if (remote?.startsWith('git@')) {
            remote = remote.split(':')[1];
        } else if (remote?.startsWith('http')) {
            remote = new URL(remote).pathname.substring(1);
        }

        remote = remote?.replace(/\.git$/, '');

        return remote || process.env.REPOSITORY_URL || 'unknown';
    } catch (error) {
        return process.env.REPOSITORY_URL || 'unknown';
    }
}

export const getVersion = async () => {
    try {
        if (!pack) {
            return process.env.APP_VERSION || 'unknown';
        }

        const packageJson = await readFile(join(pack, 'package.json'), 'utf8');
        const { version } = JSON.parse(packageJson);
        return version;
    } catch (error) {
        return process.env.APP_VERSION || 'unknown';
    }
}
