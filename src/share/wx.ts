import fs = require('fs-extra')
import path = require('path')

export const findRootFolder = (folder: string): string => {
  let projFile = path.join(folder, 'project.config.json')

  try {
    let projOptions = fs.readJSONSync(projFile)
    if (typeof projOptions.miniprogramRoot === 'string' && projOptions.miniprogramRoot) {
      return path.join(folder, projOptions.miniprogramRoot)
    }

    return folder

  } catch (error) {
    throw new Error(`File ${projFile} is not a valid json file`)
  }
}

export const findAppFileByProjectFile = (folder: string): string => {
  const rootPath = findRootFolder(folder)
  return path.join(rootPath, 'app.json')
}

export const validProject = (folder: string): Error | true => {
  if (!fs.existsSync(folder) && !fs.statSync(folder).isDirectory()) {
    return new Error(`${folder} is not exists or not a folder`)
  }

  let projFile = path.join(folder, 'project.config.json')
  if (!fs.existsSync(projFile)) {
    return new Error(`File ${projFile} is not found`)
  }

  let appFile = findAppFileByProjectFile(folder)
  if (!fs.existsSync(appFile)) {
    return new Error(`File ${appFile} is not found`)
  }

  return true
}

export const findPages = async (folder: string): Promise<Array<string>> => {
  let appFile = findAppFileByProjectFile(folder)
  let appOptions = fs.readJsonSync(appFile)
  if (!Array.isArray(appOptions.pages) || appOptions.pages.length === 0) {
    return Promise.reject(new Error('Pages is empty'))
  }

  return appOptions.pages
}
