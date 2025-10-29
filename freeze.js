function heavyTask() {
  let result = 0;
  for (let i = 0; i < 1000000000; i++) {
    result += Math.sin(i);
  }
  heavyTask();
}
heavyTask();
