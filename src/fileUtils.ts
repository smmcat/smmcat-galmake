import * as fs from 'fs/promises';
import * as path from 'path';

async function setOrCreateFile(path: string, data: string): Promise<void> {
  try {
    await fs.writeFile(path, data);
  } catch (error) {
    await createDirectoryPath(path);
    await fs.writeFile(path, data);
  }
}

async function getOrCreateFile(path: string, isArr = false): Promise<string> {
  try {
    await fs.access(path);
    return await fs.readFile(path, 'utf-8');
  } catch (error) {
    await createDirectoryPath(path);
    await fs.writeFile(path, isArr ? '[]' : '{}');
    return await fs.readFile(path, 'utf-8');
  }
}

async function createDirectoryPath(filePath: string): Promise<void> {
  const directoryPath = path.dirname(filePath);
  await fs.mkdir(directoryPath, { recursive: true });
}

export { setOrCreateFile, getOrCreateFile };
