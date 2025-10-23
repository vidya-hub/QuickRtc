import { ConferenceClient } from "/simple_ms_client/dist/client.js";
let currentParticipant = null;
let client = null;
let remoteTracks = {};
document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("myButton");
  const localVideo = document.getElementById("localVideo");
  const partList = document.getElementById("partList");
  const remoteStreams = document.getElementById("remoteStreams");
  const details = document.getElementById("details");

  button.addEventListener("click", async function () {
    const socket = io(window.location.origin);

    // Create conference client
    client = new ConferenceClient({
      conferenceId: "my-room",
      conferenceName: "My Conference",
      participantId: generateId(),
      participantName: generateId(),
      socket,
      enableAudio: true,
      enableVideo: true,
    });
    details.innerText = `Participant Name: ${client.config.participantName}\nParticipant ID: ${client.config.participantId}`;

    currentParticipant = client.config;
    client.addEventListener("participantJoined", (event) => {
      const li = document.createElement("li");
      li.textContent = event.detail.participantName;
      partList.appendChild(li);
    });
    client.addEventListener("remoteStreamAdded", async (event) => {
      //   const participantId = event.detail.participantId;
      //   if (participantId != currentParticipant.participantId) {
      const kind = event.detail.kind;
      const mediaStream = event.detail.stream;
      console.log("event details ", event.detail);
      remoteTracks[`${event.detail.participantId}-${kind}`] = mediaStream;

      let videoElement = document.getElementById(
        `remoteVideo-${event.detail.participantId}`
      );
      if (!videoElement && kind === "video") {
        videoElement = document.createElement("video");
        videoElement.id = `remoteVideo-${event.detail.participantId}`;
        videoElement.srcObject = mediaStream;
        videoElement.autoplay = true;
        videoElement.controls = true;
        videoElement.playsInline = true;
        remoteStreams.appendChild(videoElement);
      }

      //   else {
      //     videoElement = document.createElement("audio");
      //     videoElement.id = `remoteAudio-${event.detail.participantId}`;
      //     videoElement.autoplay = true;
      //     videoElement.playsInline = true;
      //     remoteStreams.appendChild(videoElement);
      //   }

      //   // Get existing MediaStream or create new one
      //   let mediaStream = videoElement.srcObject;
      //   if (!mediaStream) {
      //     mediaStream = new MediaStream();
      //   }

      //   // Add track to the stream
      //   if (track instanceof MediaStreamTrack) {
      //     mediaStream.addTrack(track);
      //   } else {
      //     console.error("Invalid track type:", track);
      //   }
      //   videoElement.srcObject = mediaStream;
      //   }
    });
    await client.joinConference();
    button.disabled = true;
    const track = await client.enableMedia(true, true);
    localVideo.srcObject = track;
    const existingParticipants = await client.getParticipants();
    console.log("existingParticipants ", existingParticipants);
    existingParticipants.forEach((part) => {
      const li = document.createElement("li");
      li.textContent = `${part.participantName} ${
        part.participantId === currentParticipant.participantId ? "(You)" : ""
      }`;
      partList.appendChild(li);
      if (part.participantId !== currentParticipant.participantId) {
        // getRemoteVideoElement(part.participantId);
      }
    });
    console.log("testing new flow");
  });
});
// async function getRemoteVideoElement(participantId) {
//   const response = await client.getProducersWithParticipantId(participantId);
//   console.log("Producers for participant ", participantId, response);
//   if (response.length != 0) {
//     client.consumeParticipantMedia(participantId, response[0].kind).then(
//   }
//   //   let videoElement = document.getElementById(`remoteVideo-${participantId}`);
//   //   if (!videoElement) {
//   //     videoElement = document.createElement("video");
//   //     videoElement.id = `remoteVideo-${participantId}`;
//   //     videoElement.autoplay = true;
//   //     videoElement.playsInline = true;
//   //     document.getElementById("remoteStreams").appendChild(videoElement);
//   //   }
//   //   return videoElement;
// }
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
