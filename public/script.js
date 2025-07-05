// Connect to signaling server using Socket.IO
const socket = io();

// Variables to store media streams and peer connection
let localStream;
let remoteStream;
let peer;
let roomId = "";

// STUN server to discover public IP (Step 1 in WebRTC architecture)
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" } // Helps discover network path
  ]
};

// Get references to the video elements on the page
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");


document.getElementById("endCallBtn").onclick = () => {
  if (peer) {
    // Close the connection
    peer.close();
    peer = null;

    // Stop local video stream
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;

    // Clear remote video
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    }

    console.log("Call ended");

    // Notify server to inform the other peer (optional)
    socket.emit("end-call", { roomId });
  }
};

// Step 2: Join Room and start capturing local video/audio
// Also prepare to send offer
// Triggered when user clicks the Join button
document.getElementById("joinBtn").onclick = async () => {
  roomId = document.getElementById("roomInput").value.trim();
  if (!roomId) return alert("Enter valid room name");

  console.log("Joining room:", roomId);
  // Join the signaling room via socket
  socket.emit("join-room", roomId);

  // Capture user's local media stream (Step 2)
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  console.log("Local stream captured");
};

// Step 3: Create offer and send it to the other peer
// Triggered when user clicks the Start Call button
document.getElementById("startCallBtn").onclick = async () => {
  createPeer(); // Create peer connection and attach handlers

  // Add local media tracks to the peer connection
  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  // Create and send offer
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  console.log("Sending offer:", offer);
  socket.emit("send-offer", { offer, roomId });
};

// Step 4: Peer connection setup and handlers
function createPeer() {
  peer = new RTCPeerConnection(servers);
  console.log("RTCPeerConnection created");

  // Step 5: When ICE candidates are found, send them via signaling
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Sending ICE candidate:", event.candidate);
      socket.emit("send-ice", { candidate: event.candidate, roomId });
    }
  };

  // Step 6: When remote track is received, add it to remote video element
  peer.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
      console.log("Remote stream initialized");
    }
    remoteStream.addTrack(event.track);
    console.log("Remote track added");
  };
}

// Step 7: Receive offer and respond with answer
socket.on("receive-offer", async (offer) => {
  console.log("Received offer:", offer);
  createPeer();

  // Add local tracks before answering
  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  // Set the offer from Peer A and create answer
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  console.log("Sending answer:", answer);
  // Send the answer back to Peer A
  socket.emit("send-answer", { answer, roomId });
});

// Step 8: Receive answer from the other peer and set it
socket.on("receive-answer", async (answer) => {
  console.log("Received answer:", answer);
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

// Step 9: Receive ICE candidate and add it to peer connection
socket.on("receive-ice", async (candidate) => {
  console.log("Received ICE candidate:", candidate);
  if (candidate) await peer.addIceCandidate(new RTCIceCandidate(candidate));
});
