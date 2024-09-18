const { setTimeout, clearTimeout } = require('timers');

let isLooking = false; // 술래가 뒤를 보고 있는 상태
let dollTimer = null; // 타이머 변수

function startDollGame(io, roomId) {
    function changeDollState() {
        isLooking = !isLooking; // 상태 반전 (보고 있는지 아닌지)
    
        // 현재 상태에 따라 클라이언트에게 메시지를 전송
        io.to(roomId).emit('dollState', isLooking);
    
        // "무궁화 꽃이 피었습니다" 메시지를 전송 (인형이 말하는 부분)
        if (!isLooking) {
            const message = "무궁화 꽃이 피었습니다";
            io.to(roomId).emit('dollMessage', message); // 말풍선 메시지 전송
        }
    
        // 다음 상태 변화를 랜덤한 시간 간격으로 설정 (2초~4초 사이)
        const nextChangeTime = Math.floor(Math.random() * 2000) + 2000;
    
        // 다음 상태 변화를 위한 타이머 설정
        dollTimer = setTimeout(changeDollState, nextChangeTime);
    }

    // 처음 상태 변화 시작
    changeDollState();
}

function stopDollGame() {
    if (dollTimer) {
        clearTimeout(dollTimer); // 인형 동작 타이머 정지
    }
    isLooking = false; // 인형 상태를 리셋
    console.log("인형이 멈췄습니다."); // 로그 확인
}

module.exports = {
    startDollGame,
    stopDollGame,
};
