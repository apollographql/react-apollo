export default function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
