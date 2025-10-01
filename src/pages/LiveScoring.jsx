import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

export default function LiveScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState({});
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [battingTeam, setBattingTeam] = useState(null);
  const [bowlingTeam, setBowlingTeam] = useState(null);

  // Modals
  const [showTossModal, setShowTossModal] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [showNewBatterModal, setShowNewBatterModal] = useState(false);
  const [showNewBowlerModal, setShowNewBowlerModal] = useState(false);

  // Temporary selection states
  const [selectedStriker, setSelectedStriker] = useState(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState(null);
  const [selectedBowler, setSelectedBowler] = useState(null);
  const [selectedNewBatter, setSelectedNewBatter] = useState(null);
  const [selectedNewBowler, setSelectedNewBowler] = useState(null);

  useEffect(() => {
    if (id) fetchMatchData();
  }, [id]);

  const fetchMatchData = async () => {
    try {
      const matchDoc = await getDoc(doc(db, "matches", id));
      if (!matchDoc.exists()) {
        navigate("/matches");
        return;
      }
      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      setMatch(matchData);

      // Fetch teams
      const [team1Doc, team2Doc] = await Promise.all([
        getDoc(doc(db, "teams", matchData.team1)),
        getDoc(doc(db, "teams", matchData.team2)),
      ]);
      const teamsData = {
        [matchData.team1]: team1Doc.exists()
          ? { id: team1Doc.id, ...team1Doc.data() }
          : null,
        [matchData.team2]: team2Doc.exists()
          ? { id: team2Doc.id, ...team2Doc.data() }
          : null,
      };
      setTeams(teamsData);

      // Fetch players for both teams
      const allPlayers = {};
      for (const teamId of [matchData.team1, matchData.team2]) {
        const teamPlayers = teamsData[teamId]?.players || [];
        for (const playerId of teamPlayers) {
          const playerDoc = await getDoc(doc(db, "players", playerId));
          if (playerDoc.exists()) {
            allPlayers[playerId] = { id: playerDoc.id, ...playerDoc.data() };
          }
        }
      }
      setPlayers(allPlayers);

      // Set batting and bowling teams based on toss
      if (matchData.status === "upcoming" && !matchData.toss) {
        setShowTossModal(true);
      } else if (matchData.toss) {
        const tossWinner = matchData.toss.winner;
        const tossDecision = matchData.toss.decision;
        if (tossDecision === "bat") {
          setBattingTeam(tossWinner);
          setBowlingTeam(
            tossWinner === matchData.team1 ? matchData.team2 : matchData.team1
          );
        } else {
          setBowlingTeam(tossWinner);
          setBattingTeam(
            tossWinner === matchData.team1 ? matchData.team2 : matchData.team1
          );
        }
      }

      // Listen for live updates
      const unsubscribe = onSnapshot(doc(db, "liveScoring", id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLiveData(data);

          // Check if initial players are set - only show modal if we have no innings data at all
          const currentInnings = data.innings?.[data.innings.length - 1];
          if (
            !currentInnings?.battersOnCrease ||
            currentInnings.battersOnCrease.length < 2 ||
            !currentInnings?.currentBowler
          ) {
            // Only show if we haven't set initial players yet (no batting/bowling arrays)
            if (
              !currentInnings?.batting ||
              currentInnings.batting.length === 0
            ) {
              setShowInitialModal(true);
            }
          }
        } else {
          // No live data exists yet, show initial modal
          setShowInitialModal(true);
        }
      });

      setLoading(false);
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching match:", error);
      setLoading(false);
    }
  };

  const handleToss = async (winner, decision) => {
    try {
      // Update match with toss result
      await updateDoc(doc(db, "matches", id), {
        toss: { winner, decision },
        status: "live",
      });

      // Determine batting and bowling teams
      let battingTeamId, bowlingTeamId;
      if (decision === "bat") {
        battingTeamId = winner;
        bowlingTeamId = winner === match.team1 ? match.team2 : match.team1;
      } else {
        bowlingTeamId = winner;
        battingTeamId = winner === match.team1 ? match.team2 : match.team1;
      }

      setBattingTeam(battingTeamId);
      setBowlingTeam(bowlingTeamId);

      // Create initial live scoring document with new schema
      const initialLiveData = {
        matchId: id,
        innings: [
          {
            teamId: battingTeamId,
            runs: 0,
            wickets: 0,
            overs: 0.0,
            batting: [],
            bowling: [],
            fielding: [],
            extraRuns: {
              wides: 0,
              noBalls: 0,
              legByes: 0,
              byes: 0,
            },
            battersOnCrease: [],
            currentBowler: null,
          },
        ],
        createdAt: new Date(),
      };

      await setDoc(doc(db, "liveScoring", id), initialLiveData);
      setShowTossModal(false);
      setShowInitialModal(true);
    } catch (error) {
      console.error("Error handling toss:", error);
      alert("Error saving toss result. Please try again.");
    }
  };

  const confirmInitialPlayers = async () => {
    if (!selectedStriker || !selectedNonStriker || !selectedBowler) {
      alert("Please select striker, non-striker and bowler");
      return;
    }

    if (selectedStriker === selectedNonStriker) {
      alert("Striker and non-striker must be different players");
      return;
    }

    try {
      const currentInnings = liveData.innings[liveData.innings.length - 1];

      // Add batters to batting array
      const updatedBatting = [
        {
          playerId: selectedStriker,
          runsScored: 0,
          ballsFaced: 0,
          out: false,
          sixes: 0,
          fours: 0,
          threes: 0,
          doubles: 0,
          singles: 0,
          dots: 0,
          order: 1,
        },
        {
          playerId: selectedNonStriker,
          runsScored: 0,
          ballsFaced: 0,
          out: false,
          sixes: 0,
          fours: 0,
          threes: 0,
          doubles: 0,
          singles: 0,
          dots: 0,
          order: 2,
        },
      ];

      // Add bowler to bowling array
      const updatedBowling = [
        {
          playerId: selectedBowler,
          runsConceded: 0,
          oversBowled: 0,
          wickets: [],
          sixes: 0,
          fours: 0,
          threes: 0,
          doubles: 0,
          singles: 0,
          dots: 0,
          order: 1,
        },
      ];

      // Update the current innings
      const updatedInnings = [...liveData.innings];
      updatedInnings[updatedInnings.length - 1] = {
        ...currentInnings,
        batting: updatedBatting,
        bowling: updatedBowling,
        battersOnCrease: [selectedStriker, selectedNonStriker],
        currentBowler: selectedBowler,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: updatedInnings,
      });

      setShowInitialModal(false);
    } catch (error) {
      console.error("Error setting initial players:", error);
      alert("Error setting initial players. Please try again.");
    }
  };

  const calculateOvers = (totalBalls) => {
    return Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
  };

  const addRuns = async (runs) => {
    if (!liveData) return;

    try {
      const currentInnings = liveData.innings[liveData.innings.length - 1];
      const striker = currentInnings.battersOnCrease[0];
      const bowler = currentInnings.currentBowler;

      // Update batting stats
      const updatedBatting = currentInnings.batting.map((b) => {
        if (b.playerId === striker) {
          const newStats = { ...b };
          newStats.runsScored += runs;
          newStats.ballsFaced += 1;

          if (runs === 6) newStats.sixes += 1;
          else if (runs === 4) newStats.fours += 1;
          else if (runs === 3) newStats.threes += 1;
          else if (runs === 2) newStats.doubles += 1;
          else if (runs === 1) newStats.singles += 1;
          else if (runs === 0) newStats.dots += 1;

          return newStats;
        }
        return b;
      });

      // Update bowling stats
      const updatedBowling = currentInnings.bowling.map((b) => {
        if (b.playerId === bowler) {
          const newStats = { ...b };
          newStats.runsConceded += runs;

          if (runs === 6) newStats.sixes += 1;
          else if (runs === 4) newStats.fours += 1;
          else if (runs === 3) newStats.threes += 1;
          else if (runs === 2) newStats.doubles += 1;
          else if (runs === 1) newStats.singles += 1;
          else if (runs === 0) newStats.dots += 1;

          return newStats;
        }
        return b;
      });
      // Always calculate overs from total balls
      const totalBalls = currentInnings.totalBalls
        ? currentInnings.totalBalls + 1
        : 1;
      const newOvers = calculateOvers(totalBalls);
      const overCompleted = totalBalls % 6 === 0;

      const updatedBowlingWithOvers = updatedBowling.map((b) => {
        if (b.playerId === bowler) {
          const totalBallsBowled = b.totalBallsBowled
            ? b.totalBallsBowled + 1
            : 1;
          const newBowlerOvers = calculateOvers(totalBallsBowled);

          return {
            ...b,
            oversBowled: newBowlerOvers,
            totalBallsBowled,
          };
        }
        return b;
      });

      // Swap striker if odd runs or over completed
      let newBattersOnCrease = [...currentInnings.battersOnCrease];
      if (runs % 2 === 1) {
        newBattersOnCrease = [newBattersOnCrease[1], newBattersOnCrease[0]];
      }
      // Swap again if over completed (so striker faces next over)
      if (overCompleted) {
        newBattersOnCrease = [newBattersOnCrease[1], newBattersOnCrease[0]];
      }

      const updatedInnings = [...liveData.innings];
      updatedInnings[updatedInnings.length - 1] = {
        ...currentInnings,
        runs: currentInnings.runs + runs,
        overs: newOvers,
        totalBalls: totalBalls,
        batting: updatedBatting,
        bowling: updatedBowlingWithOvers,
        battersOnCrease: newBattersOnCrease,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: updatedInnings,
      });

      // Show new bowler modal if over completed
      if (overCompleted) {
        setShowNewBowlerModal(true);
      }
    } catch (error) {
      console.error("Error adding runs:", error);
      alert("Error adding runs. Please try again.");
    }
  };

//   const addWicket = async () => {
//     if (!liveData) return;

//     try {
//       const currentInnings = liveData.innings[liveData.innings.length - 1];
//       const striker = currentInnings.battersOnCrease[0];
//       const nonStriker = currentInnings.battersOnCrease[1] || null;
//       const bowler = currentInnings.currentBowler;

//       // ✅ Increment total balls
//       const newTotalBalls = (currentInnings.totalBalls || 0) + 1;
//       const newOvers = calculateOvers(newTotalBalls);

//       // ✅ Check over complete
//       const overCompleted = newTotalBalls % 6 === 0;

//       // ✅ Update batting
//       const updatedBatting = currentInnings.batting.map((b) => {
//         if (b.playerId === striker) {
//           return {
//             ...b,
//             ballsFaced: (b.ballsFaced || 0) + 1,
//             out: true,
//             outType: "bowled", // TODO: dynamic later
//             outBy: bowler,
//           };
//         }
//         return b;
//       });

//       // ✅ Update bowling
//       console.log(
//         "Bowler before wicket:",
//         currentInnings.bowling.find((b) => b.playerId === bowler)
//       );
//       const updatedBowling = currentInnings.bowling.map((b) => {
//         if (b.playerId === bowler) {
//           const totalBallsBowled = b.totalBallsBowled
//             ? b.totalBallsBowled + 1
//             : 1;
//           return {
//             ...b,
//             wickets: [...(b.wickets || []), striker],
//             totalBallsBowled,
//             oversBowled: calculateOvers(totalBallsBowled),
//           };
//         }
//         return b;
//       });

//       // ✅ Update innings
//       const updatedInnings = [...liveData.innings];
//       updatedInnings[updatedInnings.length - 1] = {
//         ...currentInnings,
//         wickets: currentInnings.wickets + 1,
//         totalBalls: newTotalBalls,
//         overs: newOvers,
//         batting: updatedBatting,
//         bowling: updatedBowling,
//         // striker out → only non-striker remains, new batter will join
//         battersOnCrease: [nonStriker, null],
//       };

//       // ✅ Save to Firestore
//       await updateDoc(doc(db, "liveScoring", id), {
//         innings: updatedInnings,
//       });

//       // ✅ Show new batter modal
//       setShowNewBatterModal(true);

//       // ✅ Handle over completion → bowler change pending
//       if (overCompleted) {
//         setPendingBowlerChange(true);
//       }
//     } catch (error) {
//       console.error("Error adding wicket:", error);
//       alert("Error adding wicket. Please try again.");
//     }
//   };

const addWicket = async (outType) => {
  if (!liveData) return;

  try {
    const currentInnings = liveData.innings[liveData.innings.length - 1];
    const striker = currentInnings.battersOnCrease[0];
    const nonStriker = currentInnings.battersOnCrease[1] || null;
    const bowler = currentInnings.currentBowler;

    // ✅ Increment total balls
    const newTotalBalls = (currentInnings.totalBalls || 0) + 1;
    const newOvers = calculateOvers(newTotalBalls);
    const overCompleted = newTotalBalls % 6 === 0;

    // ✅ Update batting
    const updatedBatting = currentInnings.batting.map((b) => {
      if (b.playerId === striker) {
        return {
          ...b,
          ballsFaced: (b.ballsFaced || 0) + 1,
          out: true,
          outType,              // dynamic
          outBy: bowler,        // bowler credited by default
        };
      }
      return b;
    });

    // ✅ Update bowling
    const updatedBowling = currentInnings.bowling.map((b) => {
      if (b.playerId === bowler) {
        const totalBallsBowled = b.totalBallsBowled
          ? b.totalBallsBowled + 1
          : 1;

        return {
          ...b,
        //   wickets: [...(b.wickets || []), striker],
        wickets: outType !== "runout"
          ? [...(b.wickets || []), striker] // bowled/caught/stump → credit
          : [...(b.wickets || [])],
          totalBallsBowled,
          oversBowled: calculateOvers(totalBallsBowled),
        };
      }
      return b;
    });

    // ✅ Update innings
    const updatedInnings = [...liveData.innings];
    updatedInnings[updatedInnings.length - 1] = {
      ...currentInnings,
      wickets: currentInnings.wickets + 1,
      totalBalls: newTotalBalls,
      overs: newOvers,
      batting: updatedBatting,
      bowling: updatedBowling,
      battersOnCrease: [nonStriker, null],
    };

    await updateDoc(doc(db, "liveScoring", id), {
      innings: updatedInnings,
    });

    // ✅ Show new batter modal
    setShowNewBatterModal(true);

    if (overCompleted) {
      setPendingBowlerChange(true);
    }
  } catch (error) {
    console.error("Error adding wicket:", error);
    alert("Error adding wicket. Please try again.");
  }
};


  const confirmNewBatter = async () => {
    if (!selectedNewBatter) {
      alert("Please select a new batsman");
      return;
    }

    try {
      const currentInnings = liveData.innings[liveData.innings.length - 1];

      // Check if over was completed when wicket fell
      const ballsInOver = Math.floor((currentInnings.overs % 1) * 10);
      const shouldShowBowlerModal =
        ballsInOver === 0 && currentInnings.overs > 0;

      // Add new batter to batting array
      const newBatter = {
        playerId: selectedNewBatter,
        runsScored: 0,
        ballsFaced: 0,
        out: false,
        sixes: 0,
        fours: 0,
        threes: 0,
        doubles: 0,
        singles: 0,
        dots: 0,
        order: currentInnings.batting.length + 1,
      };

      const updatedBatting = [...currentInnings.batting, newBatter];

      // Add new batter to crease (as striker)
      const updatedBattersOnCrease = [
        selectedNewBatter,
        currentInnings.battersOnCrease[0],
      ];

      const updatedInnings = [...liveData.innings];
      updatedInnings[updatedInnings.length - 1] = {
        ...currentInnings,
        batting: updatedBatting,
        battersOnCrease: updatedBattersOnCrease,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: updatedInnings,
      });

      setSelectedNewBatter(null);
      setShowNewBatterModal(false);

      // Show bowler modal if over was completed
      if (shouldShowBowlerModal) {
        setShowNewBowlerModal(true);
      }
    } catch (error) {
      console.error("Error adding new batter:", error);
      alert("Error adding new batter. Please try again.");
    }
  };

  const confirmNewBowler = async () => {
    if (!selectedNewBowler) {
      alert("Please select a new bowler");
      return;
    }

    try {
      const currentInnings = liveData.innings[liveData.innings.length - 1];

      // Check if bowler already exists in bowling array
      const existingBowler = currentInnings.bowling.find(
        (b) => b.playerId === selectedNewBowler
      );

      let updatedBowling;
      if (existingBowler) {
        updatedBowling = currentInnings.bowling;
      } else {
        // Add new bowler to bowling array
        const newBowler = {
          playerId: selectedNewBowler,
          runsConceded: 0,
          oversBowled: 0,
          wickets: [],
          sixes: 0,
          fours: 0,
          threes: 0,
          doubles: 0,
          singles: 0,
          dots: 0,
          order: currentInnings.bowling.length + 1,
        };
        updatedBowling = [...currentInnings.bowling, newBowler];
      }

      const updatedInnings = [...liveData.innings];
      updatedInnings[updatedInnings.length - 1] = {
        ...currentInnings,
        bowling: updatedBowling,
        currentBowler: selectedNewBowler,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: updatedInnings,
      });

      setSelectedNewBowler(null);
      setShowNewBowlerModal(false);
    } catch (error) {
      console.error("Error changing bowler:", error);
      alert("Error changing bowler. Please try again.");
    }
  };

  const undoLastBall = async () => {
    if (!liveData) return;

    if (!window.confirm("Are you sure you want to undo the last ball?")) {
      return;
    }

    try {
      alert(
        "Undo feature requires ball-by-ball history tracking. This will be implemented with a balls history array."
      );
    } catch (error) {
      console.error("Error undoing last ball:", error);
      alert("Error undoing last ball. Please try again.");
    }
  };

  if (loading) return <Loading message="Loading match..." />;

  // Get batting and bowling players safely
  const battingPlayers =
    battingTeam && teams[battingTeam]?.players
      ? teams[battingTeam].players
      : [];
  const bowlingPlayers =
    bowlingTeam && teams[bowlingTeam]?.players
      ? teams[bowlingTeam].players
      : [];

  // Get current innings data
  const currentInnings = liveData?.innings?.[liveData.innings.length - 1];
  const striker = currentInnings?.battersOnCrease?.[0];
  const nonStriker = currentInnings?.battersOnCrease?.[1];
  const currentBowler = currentInnings?.currentBowler;

  const strikerStats = currentInnings?.batting?.find(
    (b) => b.playerId === striker
  );
  const nonStrikerStats = currentInnings?.batting?.find(
    (b) => b.playerId === nonStriker
  );
  const bowlerStats = currentInnings?.bowling?.find(
    (b) => b.playerId === currentBowler
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toss Modal */}
      {showTossModal && match && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Toss Result</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which team won the toss and their decision:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleToss(match.team1, "bat")}
                className="bg-green-500 hover:bg-green-600 text-white p-3 rounded transition"
              >
                {teams[match.team1]?.name || "Team 1"} Bat
              </button>
              <button
                onClick={() => handleToss(match.team1, "bowl")}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded transition"
              >
                {teams[match.team1]?.name || "Team 1"} Bowl
              </button>
              <button
                onClick={() => handleToss(match.team2, "bat")}
                className="bg-green-500 hover:bg-green-600 text-white p-3 rounded transition"
              >
                {teams[match.team2]?.name || "Team 2"} Bat
              </button>
              <button
                onClick={() => handleToss(match.team2, "bowl")}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded transition"
              >
                {teams[match.team2]?.name || "Team 2"} Bowl
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Selection Modal */}
      {showInitialModal && battingTeam && bowlingTeam && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Select Opening Players</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Striker (Batting)
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={(e) => setSelectedStriker(e.target.value)}
                  value={selectedStriker || ""}
                >
                  <option value="">Select Striker</option>
                  {battingPlayers.map((playerId) => (
                    <option key={playerId} value={playerId}>
                      {players[playerId]?.name || playerId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Non-Striker (Batting)
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={(e) => setSelectedNonStriker(e.target.value)}
                  value={selectedNonStriker || ""}
                >
                  <option value="">Select Non-Striker</option>
                  {battingPlayers.map((playerId) => (
                    <option key={playerId} value={playerId}>
                      {players[playerId]?.name || playerId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Opening Bowler
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={(e) => setSelectedBowler(e.target.value)}
                  value={selectedBowler || ""}
                >
                  <option value="">Select Bowler</option>
                  {bowlingPlayers.map((playerId) => (
                    <option key={playerId} value={playerId}>
                      {players[playerId]?.name || playerId}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={confirmInitialPlayers}
              className="bg-cricket-600 hover:bg-cricket-700 text-white p-2 rounded w-full mt-4 transition"
            >
              Start Match
            </button>
          </div>
        </div>
      )}

      {/* New Batter Modal */}
      {showNewBatterModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Select New Batsman</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  New Batsman
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={(e) => setSelectedNewBatter(e.target.value)}
                  value={selectedNewBatter || ""}
                >
                  <option value="">Select New Batsman</option>
                  {battingPlayers
                    .filter((playerId) => {
                      const currentInnings =
                        liveData?.innings?.[liveData.innings.length - 1];
                      const isAlreadyBatted = currentInnings?.batting?.some(
                        (b) => b.playerId === playerId
                      );
                      return !isAlreadyBatted;
                    })
                    .map((playerId) => (
                      <option key={playerId} value={playerId}>
                        {players[playerId]?.name || playerId}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <button
              onClick={confirmNewBatter}
              className="bg-cricket-600 hover:bg-cricket-700 text-white p-2 rounded w-full mt-4 transition"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* New Bowler Modal */}
      {showNewBowlerModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Select New Bowler</h2>
            <p className="text-sm text-gray-600 mb-3">
              Over completed! Select the next bowler.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  New Bowler
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  onChange={(e) => setSelectedNewBowler(e.target.value)}
                  value={selectedNewBowler || ""}
                >
                  <option value="">Select New Bowler</option>
                  {bowlingPlayers
                    .filter((playerId) => {
                      const currentInnings =
                        liveData?.innings?.[liveData.innings.length - 1];
                      return playerId !== currentInnings?.currentBowler;
                    })
                    .map((playerId) => (
                      <option key={playerId} value={playerId}>
                        {players[playerId]?.name || playerId}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <button
              onClick={confirmNewBowler}
              className="bg-cricket-600 hover:bg-cricket-700 text-white p-2 rounded w-full mt-4 transition"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Main scoring interface */}
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Live Scoring</h1>

        {/* Score Display */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="text-lg font-semibold">
            {teams[battingTeam]?.name || "Batting Team"}
          </h2>
          <p className="text-3xl font-bold">
            {currentInnings?.runs || 0}/{currentInnings?.wickets || 0}
            <span className="text-lg text-gray-600 ml-2">
              ({currentInnings?.overs?.toFixed(1) || "0.0"} overs)
            </span>
          </p>
        </div>

        {/* Current Players */}
        {striker && nonStriker && currentBowler && (
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2 text-green-600">Batsmen</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{players[striker]?.name}*</span>
                  <span className="font-semibold">
                    {strikerStats?.runsScored || 0} (
                    {strikerStats?.ballsFaced || 0})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{players[nonStriker]?.name}</span>
                  <span className="font-semibold">
                    {nonStrikerStats?.runsScored || 0} (
                    {nonStrikerStats?.ballsFaced || 0})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2 text-blue-600">Bowler</h3>
              <div className="flex justify-between">
                <span>{players[currentBowler]?.name}</span>
                <span className="font-semibold">
                  {bowlerStats?.oversBowled?.toFixed(1) || "0.0"}-
                  {bowlerStats?.runsConceded || 0}-
                  {bowlerStats?.wickets?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Run Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              onClick={() => addRuns(r)}
              className="bg-gray-100 hover:bg-gray-200 p-4 rounded text-lg font-bold transition"
              disabled={!striker || !currentBowler}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Wicket and Undo Buttons */}
        {/* <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => addWicket()}
            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!striker || !currentBowler}
          >
            Wicket
          </button>
        </div> */}
        <div className="grid grid-cols-2 gap-3 mb-4">
  {["bowled", "caught", "runout", "stump"].map(type => (
    <button
      key={type}
      onClick={() => addWicket(type)}
      className="bg-red-500 hover:bg-red-600 text-white p-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed capitalize"
      disabled={!striker || !currentBowler}
    >
      {type}
    </button>
  ))}
</div>

      </div>
    </div>
  );
}
