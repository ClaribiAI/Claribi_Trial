import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    useTheme,
    alpha,
    LinearProgress
} from '@mui/material';
import {
    Trophy,
    Star,
    TrendUp
} from '@phosphor-icons/react';

const OverallScoreCard = ({ kpis }) => {
    const theme = useTheme();

    // Calculate overall score based on KPIs
    const calculateScore = () => {
        if (!kpis) return 0;

        let score = 100; // Start with perfect score
        
        // Deduct points for each issue
        // Unused columns (more severe - up to 20 points)
        const unusedColumns = kpis.unused_columns?.count || 0;
        const totalColumns = kpis.total_columns || 1;
        const unusedColumnsRatio = unusedColumns / totalColumns;
        score -= Math.min(unusedColumnsRatio * 20, 20);

        // Unused measures (up to 15 points)
        const unusedMeasures = kpis.unused_measures?.count || 0;
        const totalMeasures = kpis.total_measures || 1;
        const unusedMeasuresRatio = unusedMeasures / totalMeasures;
        score -= Math.min(unusedMeasuresRatio * 15, 15);

        // Complex measures (up to 10 points)
        const complexMeasures = kpis.complex_measures?.count || 0;
        score -= Math.min(complexMeasures * 2, 10);

        // Inactive relationships (up to 10 points)
        const inactiveRelationships = kpis.inactive_relationships?.count || 0;
        const totalRelationships = kpis.total_relationships || 1;
        const inactiveRelationshipsRatio = inactiveRelationships / totalRelationships;
        score -= Math.min(inactiveRelationshipsRatio * 10, 10);

        // Many-to-many relationships (up to 10 points)
        const manyToMany = kpis.many_to_many_relationships?.count || 0;
        score -= Math.min(manyToMany * 2, 10);

        // Large tables (up to 10 points)
        const largeTables = kpis.large_tables?.count || 0;
        score -= Math.min(largeTables * 2, 10);

        // Crowded pages (up to 10 points)
        const crowdedPages = kpis.crowded_pages?.count || 0;
        score -= Math.min(crowdedPages * 1.5, 10);

        // Ensure score is between 0 and 100
        return Math.max(0, Math.min(100, Math.round(score)));
    };

    const score = calculateScore();

    // Generate casual, funny summary based on score
    const getSummary = () => {
        if (score >= 90) {
            return [
                "Wow, look at you! This dataset is cleaner than a whistle and more organized than a Marie Kondo closet. You're basically the Power BI whisperer.",
                "This is peak performance right here. Your dataset is so well-optimized, it probably makes coffee in the morning. Seriously impressive work!",
                "You've nailed it! This dataset is smoother than butter and more efficient than a Swiss watch. The Power BI gods are smiling upon you."
            ];
        } else if (score >= 75) {
            return [
                "Not bad at all! Your dataset is like a well-maintained car - it runs great, but there's always room for a tune-up. You're on the right track!",
                "Solid work! This dataset is doing pretty well, though it could use a bit of spring cleaning. Think of it as a good house that just needs some decluttering.",
                "You're in good shape! Your dataset is like a reliable friend - dependable, but occasionally needs a reminder to clean up after itself."
            ];
        } else if (score >= 60) {
            return [
                "Alright, we've seen better, but we've definitely seen worse! Your dataset is like that drawer everyone has - functional, but could use some organization.",
                "Your dataset is hanging in there! It's like a college dorm room - it works, but there's definitely some optimization potential. Time for a cleanup session!",
                "You're in the middle of the pack! Your dataset has potential, but it's carrying some extra baggage. A little TLC and it'll be running like a champ."
            ];
        } else if (score >= 45) {
            return [
                "Okay, let's be real - your dataset needs some love. It's like a garden that's been neglected for a while. Time to pull some weeds and plant some seeds!",
                "Your dataset is trying its best, but it's got some issues. Think of it as a project car - it runs, but it definitely needs work before it's road-worthy.",
                "There's work to be done here! Your dataset is like a puzzle that's missing a few pieces. Let's find those pieces and put it all together."
            ];
        } else {
            return [
                "Yikes! Your dataset is like a hoarder's garage - there's potential, but first we need to clear out the clutter. Don't worry, we've got this!",
                "Okay, this dataset needs some serious help. It's like a ship that's taking on water - we can fix it, but we need to act fast!",
                "Your dataset is in rough shape, but hey, every masterpiece starts with a mess. Time to roll up those sleeves and get to work!"
            ];
        }
    };

    const getRanking = () => {
        // Calculate percentile (inverse of score for ranking)
        // Higher score = better ranking (top percentile)
        const percentile = 100 - score;
        
        if (score >= 90) {
            return "Top 5%";
        } else if (score >= 80) {
            return "Top 10%";
        } else if (score >= 70) {
            return "Top 20%";
        } else if (score >= 60) {
            return "Top 30%";
        } else if (score >= 50) {
            return "Top 50%";
        } else if (score >= 40) {
            return "Top 70%";
        } else {
            return "Top 90%";
        }
    };

    const getScoreColor = () => {
        if (score >= 80) return theme.palette.success.main;
        if (score >= 60) return theme.palette.success.main;
        return theme.palette.error.main;
    };

    const getScoreLabel = () => {
        if (score >= 80) return "Excellent";
        if (score >= 60) return "Good";
        if (score >= 40) return "Fair";
        return "Needs Work";
    };

    const summaries = getSummary();
    // Use score to deterministically select a summary (consistent across renders)
    const summaryIndex = score % summaries.length;
    const selectedSummary = summaries[summaryIndex];

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                bgcolor: theme.palette.background.paper,
                boxShadow: theme.shadows[3],
                mb: 4
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: alpha(getScoreColor(), 0.1),
                            color: getScoreColor(),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Trophy size={20} weight="fill" />
                    </Box>
                    <Box flex={1}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: theme.palette.text.primary,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                mb: 0.5
                            }}
                        >
                            Overall Dataset Score
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                            }}
                        >
                            <TrendUp size={14} />
                            {getRanking()} of Power BI datasets
                        </Typography>
                    </Box>
                </Box>

                <Box mb={2}>
                    <Box display="flex" alignItems="baseline" gap={1} mb={1}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: getScoreColor(),
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                lineHeight: 1
                            }}
                        >
                            {score}
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: theme.palette.text.secondary,
                                fontWeight: 500
                            }}
                        >
                            /100
                        </Typography>
                        <Box
                            sx={{
                                ml: 'auto',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(getScoreColor(), 0.1),
                                color: getScoreColor(),
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}
                        >
                            {getScoreLabel()}
                        </Box>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={score}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.divider, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: getScoreColor()
                            }
                        }}
                    />
                </Box>

                <Typography
                    variant="body1"
                    sx={{
                        color: theme.palette.text.primary,
                        lineHeight: 1.6,
                        fontStyle: 'italic'
                    }}
                >
                    {selectedSummary}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default OverallScoreCard;

