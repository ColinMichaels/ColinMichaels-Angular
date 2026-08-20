const [major = 0, minor = 0] = process.versions.node
  .split('.')
  .map(segment => Number.parseInt(segment, 10));

const isSupported = (major === 22 && minor >= 22)
  || (major === 24 && minor >= 15)
  || major >= 26;

if (!isSupported) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Run \`nvm use\` to use the pinned Node 24.15.0 release runtime.`,
  );
  process.exitCode = 1;
}
