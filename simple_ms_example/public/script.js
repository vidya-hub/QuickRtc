import { ConferenceClient } from "/simple_ms_client/dist/client.js";

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("myButton");
  const localVideo = document.getElementById("localVideo");
  const partList = document.getElementById("partList");
  const remoteStreams = document.getElementById("remoteStreams");
  const details = document.getElementById("details");

  button.addEventListener("click", async function () {
    const socket = io(window.location.origin);

    // Create conference client
    const client = new ConferenceClient({
      conferenceId: "my-room",
      conferenceName: "My Conference",
      participantId: generateId(),
      participantName: generateId(),
      socket,
      enableAudio: true,
      enableVideo: true,
    });
    details.innerText = `Participant Name: ${client.config.participantName}\nParticipant ID: ${client.config.participantId}`;

    client.addEventListener("participantJoined", (event) => {
      const li = document.createElement("li");
      li.textContent = event.detail.participantName;
      partList.appendChild(li);
    });

    await client.joinConference();
    const track = await client.enableMedia(true, true);
    localVideo.srcObject = track;
    const existingParticipants = client.getParticipants();
    console.log("existingParticipants ", existingParticipants);
    existingParticipants.forEach((part) => {
      const li = document.createElement("li");
      li.textContent = part.participantName;
      partList.appendChild(li);
    });

    console.log("local track received ", track);
  });
});

// generate random id
function generateId() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
