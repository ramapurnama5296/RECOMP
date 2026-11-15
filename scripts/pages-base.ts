export function pagesBase(repository = process.env.GITHUB_REPOSITORY) {
  const name = repository?.split('/')[1] || 'recomp'
  return `/${name}/`
}
