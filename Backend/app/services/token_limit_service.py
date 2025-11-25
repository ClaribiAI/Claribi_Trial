"""
Usage Limit Service Module

Service for checking usage limits (document generations and chat queries) based on user subscription plans.
"""
import logging
from typing import Optional, Tuple
from app.config.settings import config
from app.auth2.services import UserService
from app.stats.services import StatsService

logger = logging.getLogger(__name__)


class UsageLimitService:
    """
    Service for checking usage limits per subscription plan.
    Provides methods to check if a user can perform an action based on their usage counts.
    """
    
    @staticmethod
    def get_user_plan(user_ms_object_id: str) -> str:
        """
        Get user's subscription plan from database.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Subscription plan name ('Basic', 'Premium', 'none')
            Defaults to 'none' if user not found or error occurs
        """
        try:
            user = UserService.get_user_by_ms_object_id(user_ms_object_id)
            if user and user.get('subscription'):
                plan = user.get('subscription', 'none')
                # Normalize plan name (case-insensitive)
                plan_lower = plan.lower() if plan else 'none'
                if plan_lower == 'basic':
                    return 'Basic'
                elif plan_lower == 'premium':
                    return 'Premium'
                else:
                    return 'none'
            return 'none'
        except Exception as e:
            logger.error(f"Error getting user plan for {user_ms_object_id}: {e}", exc_info=True)
            return 'none'
    
    @staticmethod
    def get_user_usage(user_ms_object_id: str, feature_type: str) -> int:
        """
        Get current usage count for a specific feature type (docs or chat).
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            feature_type: 'docs' or 'chat'
            
        Returns:
            Integer count of current usage (documents generated or chat queries)
        """
        try:
            if feature_type not in ['docs', 'chat']:
                logger.warning(f"Invalid feature_type: {feature_type}, defaulting to docs")
                feature_type = 'docs'
            
            # Get stats from StatsService
            stats = StatsService.get_user_stats(user_ms_object_id)
            
            if feature_type == 'docs':
                return stats.get('documents_generated', 0)
            else:  # chat
                return stats.get('chat_queries', 0)
        except Exception as e:
            logger.error(f"Error getting usage for {user_ms_object_id}, feature {feature_type}: {e}", exc_info=True)
            return 0
    
    @staticmethod
    def check_usage_limit(user_ms_object_id: str, plan: Optional[str] = None, feature_type: str = 'docs') -> Tuple[bool, int, int, str]:
        """
        Check if user has exceeded their usage limit for a specific feature.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            plan: Optional plan name. If None, will be retrieved from database
            feature_type: 'docs' or 'chat'
            
        Returns:
            Tuple of (allowed: bool, current_usage: int, limit: int, message: str)
            - allowed: True if user can proceed, False if limit exceeded
            - current_usage: Current count of documents/queries
            - limit: Maximum allowed count
            - message: Friendly error message if limit exceeded, empty string otherwise
        """
        try:
            # Get plan if not provided
            if plan is None:
                plan = UsageLimitService.get_user_plan(user_ms_object_id)
            
            # Normalize plan name
            plan_lower = plan.lower() if plan else 'none'
            if plan_lower == 'basic':
                plan_key = 'Basic'
            elif plan_lower == 'premium':
                plan_key = 'Premium'
            else:
                plan_key = 'none'
            
            # Get limits for this plan and feature
            plan_limits = config.PLAN_USAGE_LIMITS.get(plan_key, config.PLAN_USAGE_LIMITS.get('none', {}))
            limit = plan_limits.get(feature_type)
            
            if limit is None:
                logger.warning(f"No limits configured for plan {plan_key}, feature {feature_type}")
                # Default to allowing if no limits configured
                return True, 0, None, ''
            
            # Get current usage
            current_usage = UsageLimitService.get_user_usage(user_ms_object_id, feature_type)
            
            logger.info(f"Usage limit check for user {user_ms_object_id}, plan {plan_key}, feature {feature_type}: "
                       f"usage={current_usage}, limit={limit}")
            
            # Check limit (None means unlimited)
            exceeded = limit is not None and current_usage >= limit
            
            logger.info(f"Usage limit check result: exceeded={exceeded}")
            
            if exceeded:
                # Generate friendly error message
                feature_name = 'documentation generation' if feature_type == 'docs' else 'chat queries'
                feature_unit = 'documents' if feature_type == 'docs' else 'queries'
                
                message = (
                    f"You've reached your limit for {feature_name}. "
                    f"You've used {current_usage:,} {feature_unit} (limit: {limit:,}). "
                    f"Upgrade your plan by visiting https://www.claribi.ai"
                )
                
                return False, current_usage, limit, message
            
            # All checks passed
            return True, current_usage, limit, ''
            
        except Exception as e:
            logger.error(f"Error checking usage limit for {user_ms_object_id}, plan {plan}, feature {feature_type}: {e}", exc_info=True)
            # On error, allow the request (fail open) but log the error
            return True, 0, None, ''
    
    @staticmethod
    def check_approaching_limit(user_ms_object_id: str, plan: Optional[str] = None, feature_type: str = 'docs') -> Tuple[bool, int, int, int, str]:
        """
        Check if user is approaching their usage limit for a specific feature.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            plan: Optional plan name. If None, will be retrieved from database
            feature_type: 'docs' or 'chat'
            
        Returns:
            Tuple of (is_approaching: bool, current_usage: int, limit: int, remaining: int, warning_message: str)
            - is_approaching: True if remaining usage is below threshold, False otherwise
            - current_usage: Current count of documents/queries
            - limit: Maximum allowed count
            - remaining: Number of uses remaining
            - warning_message: Friendly warning message if approaching limit, empty string otherwise
        """
        try:
            # Get plan if not provided
            if plan is None:
                plan = UsageLimitService.get_user_plan(user_ms_object_id)
            
            # Normalize plan name
            plan_lower = plan.lower() if plan else 'none'
            if plan_lower == 'basic':
                plan_key = 'Basic'
            elif plan_lower == 'premium':
                plan_key = 'Premium'
            else:
                plan_key = 'none'
            
            # Get limits for this plan and feature
            plan_limits = config.PLAN_USAGE_LIMITS.get(plan_key, config.PLAN_USAGE_LIMITS.get('none', {}))
            limit = plan_limits.get(feature_type)
            
            if limit is None:
                # No limits configured means unlimited, so not approaching
                return False, 0, None, None, ''
            
            # Get current usage
            current_usage = UsageLimitService.get_user_usage(user_ms_object_id, feature_type)
            
            # Calculate remaining
            remaining = limit - current_usage
            
            # Define thresholds: docs < 5, chat < 20
            threshold = 5 if feature_type == 'docs' else 20
            
            # Check if approaching limit (remaining is below threshold and greater than 0)
            is_approaching = remaining > 0 and remaining < threshold
            
            logger.info(f"Approaching limit check for user {user_ms_object_id}, plan {plan_key}, feature {feature_type}: "
                       f"usage={current_usage}, limit={limit}, remaining={remaining}, threshold={threshold}, approaching={is_approaching}")
            
            if is_approaching:
                # Generate friendly warning message
                feature_name = 'documentation generation' if feature_type == 'docs' else 'chat queries'
                feature_unit = 'documents' if feature_type == 'docs' else 'queries'
                
                message = (
                    f"You're running low on {feature_name}. "
                    f"You have {remaining} {feature_unit} remaining (limit: {limit:,}). "
                    f"Upgrade your plan at https://www.claribi.ai to continue without limits."
                )
                
                return True, current_usage, limit, remaining, message
            
            # Not approaching limit
            return False, current_usage, limit, remaining, ''
            
        except Exception as e:
            logger.error(f"Error checking approaching limit for {user_ms_object_id}, plan {plan}, feature {feature_type}: {e}", exc_info=True)
            # On error, return not approaching (fail safe)
            return False, 0, None, None, ''


# Singleton instance
usage_limit_service = UsageLimitService()

