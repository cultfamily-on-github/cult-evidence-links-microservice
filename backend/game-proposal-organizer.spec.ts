import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts"
import { GameProposalOrganizer } from "./game-proposal-organizer.ts"

Deno.test("get future games", async () => {

    const actualOutput = await GameProposalOrganizer.getFutureGames()

    const expectedOutput = [{
        "id": 3,
        "text": "c",
        "proposalDateUTC": "2022-09-30 10:46:14",
        "expiryDateUTC": "9999-10-01 00:00:00",
        "rating": 0,
        "proposedBy": "https://twitter.com/Peer2PeerE",
        "currentVisitorsVoteForItem": 6
    },
    {
        "id": 4,
        "text": "d",
        "proposalDateUTC": "2022-09-30 10:46:14",
        "expiryDateUTC": "9999-10-01 00:00:00",
        "rating": 0,
        "proposedBy": "https://twitter.com/Peer2PeerE",
        "currentVisitorsVoteForItem": 6
    }
    ]
    assertEquals(actualOutput, expectedOutput)

})
Deno.test("get executed or started games", async () => {

    const actualOutput = await GameProposalOrganizer.getExecutedOrStartedGames()

    const expectedOutput = [
        {
            "id": 1,
            "text": "a",
            "proposalDateUTC": "2022-09-30 10:46:14",
            "expiryDateUTC": "2022-09-30 00:00:00",
            "rating": 0,
            "proposedBy": "https://twitter.com/Peer2PeerE",
            "currentVisitorsVoteForItem": 7
        },
        {
            "id": 1,
            "text": "b",
            "proposalDateUTC": "2022-09-30 10:46:14",
            "expiryDateUTC": "2022-10-01 00:00:00",
            "rating": 0,
            "proposedBy": "https://twitter.com/Peer2PeerE",
            "currentVisitorsVoteForItem": 6
        }
    ]
    assertEquals(actualOutput, expectedOutput)

})

Deno.test("get next free expiry date", async () => {

    const testInput = [
        {
            "id": 1,
            "text": "a",
            "proposalDateUTC": "2022-09-30 10:46:14",
            "expiryDateUTC": "2022-09-30 00:00:00",
            "rating": 0,
            "proposedBy": "https://twitter.com/Peer2PeerE",
            "currentVisitorsVoteForItem": 7
        },
        {
            "id": 1,
            "text": "a",
            "proposalDateUTC": "2022-09-30 10:46:14",
            "expiryDateUTC": "2022-10-01 00:00:00",
            "rating": 0,
            "proposedBy": "https://twitter.com/Peer2PeerE",
            "currentVisitorsVoteForItem": 6
        }
    ]

    const actualOutput = GameProposalOrganizer.getNextFreeExpiryDate(testInput)
    const expectedOutput = "2022-10-02 00:00:00"
    assertEquals(actualOutput, expectedOutput)

})


