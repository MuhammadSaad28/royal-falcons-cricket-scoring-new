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
  const [selectedRuns, setSelectedRuns] = useState(1); // default 1 run
  const [currentOverlay, setCurrentOverlay] = useState("none"); 

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
  const [pendingBowlerChange, setPendingBowlerChange] = useState(false);

  const [inningActive, setInningActive] = useState(true);
  const [matchFinished, setMatchFinished] = useState(false);

  const completeMatch = async () => {
  try {
    const matchRef = doc(db, "matches", id);
    await updateDoc(matchRef, {
      status: "completed",
      completedAt: new Date(),
    });
    navigate("/match/" + id);
  } catch (error) {
    console.error("Error completing match:", error);
    alert("Error marking match as completed. Please try again.");
  }
};

  const checkInningEnd = (currentInnings, match, inningIndex) => {
    if (!currentInnings || !match || !liveData) return false;
    const maxOvers = match.overs; // from matches collection
    const totalPlayers = match.totalPlayersPerTeam;

    // 1st or 2nd inning criteria
    if (currentInnings.wickets >= totalPlayers - 1) return true;
    if (currentInnings.overs >= maxOvers) return true;

    if (inningIndex === 1) {
      // chasing team runs check
      const firstInnings = liveData.innings[0];
      if (currentInnings.runs > firstInnings.runs) return true;
    }

    return false;
  };

  const startSecondInning = async () => {
    try {
      const newBattingTeam = bowlingTeam; // ab doosri team batting karegi
      const newBowlingTeam = battingTeam; // pehli wali team ab bowl karegi

      const newInnings = {
        teamId: newBattingTeam,
        runs: 0,
        wickets: 0,
        overs: 0,
        totalBalls: 0,
        batting: [],
        bowling: [],
        fielding: [],
        extraRuns: { wides: 0, noBalls: 0, legByes: 0, byes: 0 },
        battersOnCrease: [],
        currentBowler: null,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: [...liveData.innings, newInnings],
      });

      // ✅ reset React state
      setBattingTeam(newBattingTeam);
      setBowlingTeam(newBowlingTeam);

      setSelectedStriker(null);
      setSelectedNonStriker(null);
      setSelectedBowler(null);

      setInningActive(true);
      setShowInitialModal(true); // opening players modal
    } catch (error) {
      console.error("Error starting 2nd inning:", error);
    }
  };

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
        getDoc(doc(db, "teams", matchData?.team1)),
        getDoc(doc(db, "teams", matchData?.team2)),
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
          const currentInnings = data.innings?.[data.innings.length - 1];
          setBattingTeam(currentInnings.teamId);
          setBowlingTeam(
            currentInnings.teamId === matchData.team1
              ? matchData.team2
              : matchData.team1
          );

          if (currentInnings) {
            // agar innings abhi start hui aur batting array empty hai to modal dikhao
            if (
              (!currentInnings.batting ||
                currentInnings.batting.length === 0) &&
              (!currentInnings.bowling || currentInnings.bowling.length === 0)
            ) {
              setShowInitialModal(true);
            }
          }
          // Check if inning ended
          if (
            checkInningEnd(currentInnings, matchData, data.innings.length - 1)
          ) {
            setInningActive(false);
            if (data.innings.length === 1) {
              // First inning khatam
              // startSecondInning();
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

      if (
        checkInningEnd(
          updatedInnings[updatedInnings.length - 1],
          match,
          updatedInnings.length - 1
        )
      ) {
        setInningActive(false);

        if (updatedInnings.length === 1) {
          // First inning khatam
        } else {
          // Second innings khatam → match finish
          setMatchFinished(true);
        }
        return;
      }

      // Show new bowler modal if over completed
      if (overCompleted) {
        setShowNewBowlerModal(true);
      }
    } catch (error) {
      console.error("Error adding runs:", error);
      alert("Error adding runs. Please try again.");
    }
  };

  const addExtras = async (type, runs = 1) => {
    if (!liveData) return;

    try {
      const currentInningsIndex = liveData.innings.length - 1;
      const currentInnings = liveData.innings[currentInningsIndex];
      const bowler = currentInnings.currentBowler;

      const updatedExtraRuns = { ...currentInnings.extraRuns };
      let bowlerRuns = 0;
      let totalRunsToAdd = 0;
      let shouldIncrementBall = false;

      if (type === "wide") {
        updatedExtraRuns.wides = (updatedExtraRuns.wides || 0) + runs;
        bowlerRuns = runs; // wides count to bowler
        totalRunsToAdd = runs;
        shouldIncrementBall = false;
      } else if (type === "noball") {
        updatedExtraRuns.noBalls = (updatedExtraRuns.noBalls || 0) + runs;
        bowlerRuns = runs; // no balls count to bowler
        totalRunsToAdd = runs;
        shouldIncrementBall = false;
      } else if (type === "byes") {
        updatedExtraRuns.byes = (updatedExtraRuns.byes || 0) + runs;
        totalRunsToAdd = runs; // but not bowler
        shouldIncrementBall = true;
      } else if (type === "legbyes") {
        updatedExtraRuns.legByes = (updatedExtraRuns.legByes || 0) + runs;
        totalRunsToAdd = runs; // but not bowler
        shouldIncrementBall = true;
      }

      // Update bowling stats
      let updatedBowling = currentInnings.bowling.map((b) => {
        if (b.playerId === bowler) {
          return {
            ...b,
            runsConceded: b.runsConceded + bowlerRuns,
          };
        }
        return b;
      });

      const updatedRuns = (currentInnings.runs || 0) + totalRunsToAdd;
      let updatedTotalBalls = currentInnings.totalBalls || 0;
      let updatedOvers = currentInnings.overs || 0;
      let overCompleted = false;

      if (shouldIncrementBall) {
        updatedTotalBalls += 1;
        updatedOvers = calculateOvers(updatedTotalBalls);
        overCompleted = updatedTotalBalls % 6 === 0;

        // Bowler ki balls bhi update karo
        updatedBowling = updatedBowling.map((b) => {
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
      }

      // Swap striker if odd runs
      let newBattersOnCrease = [...currentInnings.battersOnCrease];
      if (runs % 2 === 1) {
        newBattersOnCrease = [newBattersOnCrease[1], newBattersOnCrease[0]];
      }
      // Swap again if over completed
      if (overCompleted) {
        newBattersOnCrease = [newBattersOnCrease[1], newBattersOnCrease[0]];
      }

      const updatedInnings = [...liveData.innings];
      updatedInnings[currentInningsIndex] = {
        ...currentInnings,
        bowling: updatedBowling,
        extraRuns: updatedExtraRuns,
        runs: updatedRuns,
        totalBalls: updatedTotalBalls,
        overs: updatedOvers,
        battersOnCrease: newBattersOnCrease,
      };

      await updateDoc(doc(db, "liveScoring", id), {
        innings: updatedInnings,
      });
      setSelectedRuns(1); // reset to default 1

      if (shouldIncrementBall) {
        if (
          checkInningEnd(
            updatedInnings[updatedInnings.length - 1],
            match,
            updatedInnings.length - 1
          )
        ) {
          setInningActive(false);

          if (updatedInnings.length === 1) {
          } else {
            setMatchFinished(true);
          }
          return;
        }

        // Show new bowler modal if over completed
        if (overCompleted) {
          setShowNewBowlerModal(true);
        }
      }
    } catch (error) {
      console.error("Error adding extras:", error);
      alert("Error adding extras. Please try again.");
    }
  };

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
            outType, // dynamic
            outBy: bowler, // bowler credited by default
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
            wickets:
              outType !== "runout"
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

      if (
        checkInningEnd(
          updatedInnings[updatedInnings.length - 1],
          match,
          updatedInnings.length - 1
        )
      ) {
        setInningActive(false);

        if (updatedInnings.length === 1) {
          // First inning khatam
        } else {
          // Second innings khatam → match finish
          setMatchFinished(true);
        }
        return;
      }

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
      //   if (shouldShowBowlerModal) {
      //     setShowNewBowlerModal(true);
      //   }
      if (pendingBowlerChange) {
        setShowNewBowlerModal(true);
        setPendingBowlerChange(false);
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

 const swapBattersInDB = async () => {
  try {
    const currentInnings = liveData.innings[liveData.innings.length - 1];
    const striker = currentInnings.battersOnCrease[0];
    const nonStriker = currentInnings.battersOnCrease[1];
    
    // Swap the batters
    const updatedInnings = [...liveData.innings];
    updatedInnings[updatedInnings.length - 1] = {
      ...currentInnings,
      battersOnCrease: [nonStriker, striker]
    };
    
    const liveRef = doc(db, "liveScoring", id);
    await updateDoc(liveRef, {
      innings: updatedInnings
    });
  } catch (error) {
    console.error("Error swapping batters in DB:", error);
  }
};

 const setOverlayType = async (overlayType) => {
    try {
        const liveRef = doc(db, "liveScoring", id);
    await updateDoc(liveRef, {
      overlayType: overlayType,
    });
    setCurrentOverlay(overlayType);
     
    } catch (error) {
      console.error("Error updating overlay type:", error);
    } 
  };

  // 🟡 Buttons UI
  const overlayButtons = [
    { label: "Score", type: "none" },
    { label: "Team 1 Batting", type: "team1_batting" },
    { label: "Team 1 Bowling", type: "team1_bowling" },
    { label: "Team 2 Batting", type: "team2_batting" },
    { label: "Team 2 Bowling", type: "team2_bowling" },
    { label: "Summary", type: "summary" },
  ];

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
        {!matchFinished && (
          <>
          {/* swap batters button in db */}
          <div className="mb-4">
            <button
             onClick={() => swapBattersInDB()}
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded w-full transition"
            >
              Swap Batters
            </button>
          </div>
          {/* Run Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <button
                key={r}
                  onClick={() => addRuns(r)}
                  className="bg-gray-100 hover:bg-gray-200 p-4 rounded text-lg font-bold transition"
                  //   disabled={!striker || !currentBowler}
                  disabled={
                    !striker || !currentBowler || !inningActive || matchFinished
                  }
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Extras Buttons */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {["byes", "legbyes", "noball", "wide"].map((type) => {
                return (
                  <div key={type} className="flex flex-col items-center">
                    <label className="text-sm font-medium capitalize">
                      {type}
                    </label>

                    {/* Dropdown */}
                    <select
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm font-bold transition mb-2"
                      value={selectedRuns}
                      onChange={(e) =>
                        setSelectedRuns(parseInt(e.target.value, 10))
                      }
                      disabled={
                        !striker ||
                        !currentBowler ||
                        !inningActive ||
                        matchFinished
                      }
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    {/* Button */}
                    <button
                      onClick={() => addExtras(type, selectedRuns)}
                      className="bg-cricket-600 text-white hover:bg-cricket-700 px-4 py-2 rounded text-sm font-bold transition"
                      disabled={
                        !striker ||
                        !currentBowler ||
                        !inningActive ||
                        matchFinished
                      }
                    >
                      Add {type}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {["bowled", "caught", "runout", "stump"].map((type) => (
                <button
                  key={type}
                  onClick={() => addWicket(type)}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed capitalize"
                  //   disabled={!striker || !currentBowler}
                  disabled={
                    !striker || !currentBowler || !inningActive || matchFinished
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </>
        )}
        {/* set overlay buttons // 'none', 'team1_batting', 'team1_bowling', 'team2_batting', 'team2_bowling', 'summary' */}
        {/* header for overlay */}
        <h3 className="text-lg font-semibold text-black-200 mb-2">Live Stream Overlay</h3>
<div className="grid grid-cols-5 gap-3 mb-4">
 {overlayButtons.map((btn) => (
        <button
          key={btn.type}
          onClick={() => setOverlayType(btn.type)}
          disabled={loading}
          className={`px-4 py-2 rounded-md font-semibold text-sm transition-all
            ${currentOverlay === btn.type
              ? "bg-emerald-500 text-white"
              : "bg-gray-700 text-gray-200 hover:bg-emerald-600"}
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {btn.label}
        </button>
      ))}
</div>
        

        {!inningActive && !matchFinished && liveData?.innings?.length === 1 && (
          <div className="text-center mt-4">
            <button
              onClick={startSecondInning}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Start 2nd Innings
            </button>
          </div>
        )}
        {matchFinished && (
          <div className="text-center mt-4">
            <h2 className="text-xl font-bold text-cricket-600">
              Match Finished!
            </h2>
            <p className="mt-2">Thank you for using the live scoring app.</p>
            <button
              onClick={() => completeMatch()}
              className="mt-4 bg-cricket-600 hover:bg-cricket-700 text-white px-4 py-2 rounded"
            >
              Back to Scorecard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
