import { PersistenceService } from "./persistence-service.ts"
import { IGameProposal, IGameProposalInbound, IVote, IMasterkeyFileEntry, IVoteInbound, IApprenticeKeyFileEntry } from "./data-model.ts";
import { SortService, Direction, ISortOptions } from "https://deno.land/x/sort@v1.1.1/mod.ts"
import { DateDoctor } from "./date-doctor/date-doctor.ts"


export class GameProposalOrganizer {

    public static async ensureSystemConsistency() {
        // tbd ensure persistence (files) are available ... can be valuable esp. for people who want to run their own backends / cultplaygrounds 

        await GameProposalOrganizer.sortGameProposalsByExpiryDate()
        await GameProposalOrganizer.updateDataToFitNewDataModel()
    }

    public static async getExecutedOrStartedGames() {

        const gameProposals = await PersistenceService.readGameProposals()
        
        const executedOrStartedGames: IGameProposal[] = []

        for (const gameProposal of gameProposals) {
            const gameExpiryDate = gameProposal.expiryDateUTC
            const lastMomentOfToday = DateDoctor.getLastMomentOfTodayFromDate(new Date())

            if (DateDoctor.isAfter(gameExpiryDate, lastMomentOfToday) === false){
                executedOrStartedGames.push(gameProposal)
            }
        }

        return executedOrStartedGames

    }

    public static async getFutureGames() {
        const gameProposals: IGameProposal[] = await PersistenceService.readGameProposals()

        const futureGames: IGameProposal[] = []

        for (const gameProposal of gameProposals) {
            const gameExpiryDate = gameProposal.expiryDateUTC
            const lastMomentOfToday = DateDoctor.getLastMomentOfTodayFromDate(new Date())

            if (DateDoctor.isAfter(gameExpiryDate, lastMomentOfToday)){
                futureGames.push(gameProposal)
            }
        }

        return futureGames
    }


    public static async sortFutureGamesByRatingAndExpiryDate() {
        const sortOptions: ISortOptions[] = [
            { fieldName: 'rating', direction: Direction.DESCENDING },
            { fieldName: 'expiryDateUTC', direction: Direction.DESCENDING }
        ]
        
        const gameProposals = await PersistenceService.readGameProposals()

        const sortedArray = SortService.sort(gameProposals, sortOptions)
        await PersistenceService.writeGameProposals(sortedArray)

    }



    public static async updateDataToFitNewDataModel() {
        const gameProposals = await PersistenceService.readGameProposals()

        for (const gameProposal of gameProposals) {
            // nothing to be updated atm
        }

        await PersistenceService.writeGameProposals(gameProposals)
    }

    public static async addGameProposal(gameProposalInbound: IGameProposalInbound): Promise<void> {

        console.log(`adding game proposal ${JSON.stringify(gameProposalInbound)}`)

        const masterKeys = await PersistenceService.readMasterKeysFile()

        console.log("temp debug 1")
        const masterKeyFileEntry: IMasterkeyFileEntry
            = masterKeys.filter((m: IMasterkeyFileEntry) => m.masterKey === gameProposalInbound.fromMasterKey)[0]

        console.log("temp debug 2")

        if (masterKeyFileEntry === undefined) {
            const errorMessage = `the masterkey ${gameProposalInbound.fromMasterKey} might be wrong.`
            console.log(errorMessage)
            throw new Error(errorMessage)
        }

        const gameProposals = await PersistenceService.readGameProposals()
        console.log("temp debug a")
        const gameProposal: IGameProposal = {
            id: (gameProposals[0] === undefined) ? 1 : gameProposals[0].id + 1, // we sort or use unshift accordingly before saving
            text: gameProposalInbound.text,
            proposalDateUTC: DateDoctor.getFormattedUTCDateFromDate(new Date()),
            expiryDateUTC: GameProposalOrganizer.getNextFreeExpiryDate(gameProposals),
            rating: 0,
            proposedBy: masterKeyFileEntry.socialMediaLink,
            currentVisitorsVoteForItem: 0
        }

        console.log("temp debug b")
        gameProposals.unshift(gameProposal)

        console.log("temp debug c")
        await PersistenceService.writeGameProposals(gameProposals)

        console.log(`successfully added game proposal to ${PersistenceService.pathToGameProposals}`)

    }

    public static async addVoteOnGameProposal(voteInbound: IVoteInbound): Promise<number> {

        const apprenticeKeys = await PersistenceService.readApprenticeKeysFile()
        const masterKeys = await PersistenceService.readMasterKeysFile()

        const apprenticeKeysEntry: IApprenticeKeyFileEntry =
            apprenticeKeys.filter((m: IApprenticeKeyFileEntry) => m.apprenticeKey === voteInbound.fromKey)[0]

        let masterKeyFileEntry: IMasterkeyFileEntry = {} as IMasterkeyFileEntry

        if (apprenticeKeysEntry === undefined) {

            masterKeyFileEntry = masterKeys.filter((m: IMasterkeyFileEntry) => m.masterKey === voteInbound.fromKey)[0]

            if (masterKeyFileEntry === undefined) {
                const errorMessage = `the key ${voteInbound.fromKey} might be wrong.`
                console.log(errorMessage)
                throw new Error(errorMessage)
            }
        }
        
        const votes: IVote[] = await PersistenceService.readVotes()

        const voteBy = (apprenticeKeysEntry === undefined) ? masterKeyFileEntry.socialMediaLink : apprenticeKeysEntry.socialMediaLink

        const existingVoteOnGameProposal = votes.filter((v: IVote) => v.id === voteInbound.id && v.voteBy === voteBy)[0]

        if (existingVoteOnGameProposal !== undefined) {
            throw new Error(`you have already voted on this proposal. you gave it a ${existingVoteOnGameProposal.rating} earlier.`)
        }

        console.log(`adding vote on game proposal ${JSON.stringify(voteInbound)}`)


        const vote: IVote = {
            id: voteInbound.id,
            votingDate: DateDoctor.getFormattedUTCDateFromDate(new Date()),
            rating: voteInbound.rating,
            voteBy
        }


        votes.unshift(vote)

        await PersistenceService.writeVotes(votes)


        const newRatingOfProposal = await GameProposalOrganizer.updateRatingInGameProposalWithAverageRank(voteInbound.id, votes)

        return newRatingOfProposal

    }


    public static async updateRatingInGameProposalWithAverageRank(id: number, votes: IVote[]): Promise<number> {

        let sum = 0
        let counter = 0

        for (const vote of votes) {

            if (id === vote.id)  {
                sum = sum + vote.rating   
                counter++
            }
        }

        const roundedAverageRating = Number((sum / counter).toFixed(1))

        const gameProposals = await PersistenceService.readGameProposals()

        for (const gameProposal of gameProposals) {
            if (gameProposal.id === id) {
                gameProposal.rating = roundedAverageRating
            }
        }

        await PersistenceService.writeGameProposals(gameProposals)

        return roundedAverageRating
    }


    public static getNextFreeExpiryDate(gameProposals: IGameProposal[]): string {

        if (gameProposals.length === 0) {
            return DateDoctor.getLastMomentOfTodayFromDate(new Date())
        }

        const sortOptions: ISortOptions[] = [
            { fieldName: 'expiryDateUTC', direction: Direction.DESCENDING }
        ]

        const sortedArray = SortService.sort(gameProposals, sortOptions)

        const latestExpiryDateInList = sortedArray[0].expiryDateUTC

        return DateDoctor.addOneDay(latestExpiryDateInList)

    }

    public static async sortGameProposalsByExpiryDate() {
        const sortOptions: ISortOptions[] = [
            { fieldName: 'expiryDateUTC', direction: Direction.DESCENDING }
        ]

        const gameProposals = await PersistenceService.readGameProposals()
        const sortedArray = SortService.sort(gameProposals, sortOptions)
        await PersistenceService.writeGameProposals(sortedArray)

    }

}