import fs from 'fs';
import path from 'path';

interface Folder {
    name: string;
    title?: string;
    child: Folder[] | string;
}

interface pathItem {
    name: string;
    title?: string;
    child: Folder[] | string;
}

export const createPathMapByDir = (folderPath: string): Folder[] => {
    const files: string[] = fs.readdirSync(folderPath);
    let folders: Folder[] = [];

    for (const file of files) {
        const filePath: string = path.join(folderPath, file);
        const stat: fs.Stats = fs.statSync(filePath);

        files.sort((a, b) =>
        {
            return parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]);
        });

        if (stat.isDirectory()) {
            let folder: Folder = { name: file, child: [] };

            const titleFilePath: string = path.join(filePath, 'title.txt');
            if (fs.existsSync(titleFilePath)) {
                const titleContent: string = fs.readFileSync(titleFilePath, 'utf8').trim();
                folder.title = titleContent;
            }

            const resultFilePath: string = path.join(filePath, 'result.txt');
            if (fs.existsSync(resultFilePath)) {
                const resultContent: string = fs.readFileSync(resultFilePath, 'utf8').trim();
                folder.child = resultContent;
            } else {
                folder.child = createPathMapByDir(filePath);
            }

            folders.push(folder);
        }
    }
    return folders;
}

export const createDirMapByObject = (folders: pathItem[], parentPath: string) => {
    for (const folder of folders) {
        const folderPath = path.join(parentPath, folder.name);
        fs.mkdirSync(folderPath);

        if (folder.title) {
            const titleFilePath = path.join(folderPath, 'title.txt');
            fs.writeFileSync(titleFilePath, folder.title);
        }

        if (typeof folder.child === 'string') {
            const resultFilePath = path.join(folderPath, 'result.txt');
            fs.writeFileSync(resultFilePath, folder.child);
        } else {
            createDirMapByObject(folder.child, folderPath);
        }
    }
}
