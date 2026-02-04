const { io } = require("socket.io-client");

const socket = io("http://localhost:4001");

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("chat_join", {
    chatId: 1,
    userId: 1
  });

  socket.emit("chat_message", {
    chatId: 1,
    userId: 1,
    message: "Imam 4 dana i budzet 700 evra, volim hranu i muzeje",
    criteriaSoFar: { from: "Beograd" }
  });
});

socket.on("chat_state", (d) => {
  console.log("STATE", d);
});

socket.on("chat_response_start", (d) => {
  console.log("START", d);
});

socket.on("chat_response_chunk", (d) => {
  process.stdout.write(d.delta);
});

socket.on("chat_response_done", (d) => {
  console.log("\nDONE", d);
  socket.disconnect();
});

socket.on("chat_error", (e) => {
  console.log("ERROR", e);
});
